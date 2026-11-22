import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Admin authentication primitives.
 *
 * This module intentionally has no top-level `next/headers` import so the
 * proxy can import it without pulling request-only APIs into its bundle.
 */

/** Name of the HTTP-only cookie that carries the signed admin session. */
export const ADMIN_SESSION_COOKIE = "admin_session";

/** Session lifetime in seconds (8 hours). */
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

export type AdminAuthConfig = {
  password: string;
  secret: string;
};

/**
 * Read the admin credentials from the environment.
 *
 * Returns `null` when either value is missing so every caller can fail closed
 * instead of falling back to an insecure default.
 */
export function getAdminAuthConfig(): AdminAuthConfig | null {
  const password = process.env.ADMIN_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!password || !secret) {
    return null;
  }

  return { password, secret };
}

/** Whether both `ADMIN_PASSWORD` and `AUTH_SECRET` are configured. */
export function isAdminAuthConfigured(): boolean {
  return getAdminAuthConfig() !== null;
}

/**
 * Compare two strings without leaking their contents through timing.
 * Lengths are checked first because `timingSafeEqual` throws on a mismatch.
 */
function safeEqual(a: string, b: string): boolean {
  const aBytes = Buffer.from(a, "utf8");
  const bBytes = Buffer.from(b, "utf8");

  if (aBytes.length !== bBytes.length) {
    return false;
  }

  return timingSafeEqual(aBytes, bBytes);
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** Validate the submitted password against `ADMIN_PASSWORD`. */
export function verifyAdminPassword(candidate: string): boolean {
  const config = getAdminAuthConfig();

  if (!config) {
    return false;
  }

  return safeEqual(candidate, config.password);
}

type SessionPayload = {
  v: 1;
  exp: number;
};

function isValidSessionPayload(value: unknown): value is SessionPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    payload.v === 1 &&
    typeof payload.exp === "number" &&
    Number.isFinite(payload.exp)
  );
}

/**
 * Build a signed `payload.signature` session token that expires after
 * `ADMIN_SESSION_TTL_SECONDS`. Returns `null` when auth is not configured.
 */
export function createAdminSessionToken(): string | null {
  const config = getAdminAuthConfig();

  if (!config) {
    return null;
  }

  const payload: SessionPayload = {
    v: 1,
    exp: Date.now() + ADMIN_SESSION_TTL_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );

  return `${encoded}.${signPayload(encoded, config.secret)}`;
}

/**
 * Verify a session token's HMAC and expiry. Missing, malformed, forged, or
 * expired tokens all return `false`, and a missing `AUTH_SECRET` fails closed.
 */
export function verifyAdminSessionToken(
  token: string | undefined | null,
): boolean {
  const config = getAdminAuthConfig();

  if (!config || !token) {
    return false;
  }

  const parts = token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [encoded, signature] = parts;

  if (!encoded || !signature) {
    return false;
  }

  const expected = signPayload(encoded, config.secret);

  if (!safeEqual(signature, expected)) {
    return false;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return false;
  }

  if (!isValidSessionPayload(parsed)) {
    return false;
  }

  return parsed.exp > Date.now();
}

/**
 * Issue the signed session cookie. Only call this from a Server Action or
 * Route Handler. Returns `false` when auth is not configured.
 */
export async function createAdminSession(): Promise<boolean> {
  const token = createAdminSessionToken();

  if (!token) {
    return false;
  }

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_TTL_SECONDS,
  });

  return true;
}

/** Read and verify the session cookie of the current request. */
export async function verifyAdminSession(): Promise<boolean> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

/** Clear the session cookie. Only call this from a Server Action. */
export async function clearAdminSession(): Promise<void> {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
