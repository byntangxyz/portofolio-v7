import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Local upload storage.
 *
 * Uploaded files live in `UPLOAD_DIR` (outside `public/`) and are served back
 * through the `/api/uploads/[filename]` Route Handler so every request is
 * validated against the same filename rules used when saving.
 */

const DEFAULT_UPLOAD_DIR = "./data/uploads";

/** Directory that holds uploaded originals. Never import this in a client bundle. */
export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? DEFAULT_UPLOAD_DIR;

/** Public URL prefix that maps onto `UPLOAD_DIR`. */
export const UPLOAD_URL_PREFIX = "/api/uploads/";

/** Maximum accepted upload size (5 MB). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Allowed image MIME types mapped to the stored file extension. */
export const UPLOAD_MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
} as const;

export type UploadMimeType = keyof typeof UPLOAD_MIME_EXTENSIONS;

/** Extensions we are willing to serve, mapped back to their content type. */
const EXTENSION_CONTENT_TYPES = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
  gif: "image/gif",
} as const;

/**
 * Only plain basenames made of ASCII letters, digits, dots, dashes, and
 * underscores are accepted. Dots are allowed for extensions but a leading dot
 * (hidden files) is rejected separately.
 */
const SAFE_FILENAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

const MAX_FILENAME_LENGTH = 180;

/** Raised when an upload cannot be accepted. Messages are safe for the admin UI. */
export class UploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadError";
  }
}

function getUploadRoot(): string {
  return path.resolve(UPLOAD_DIR);
}

/**
 * Decode a URI component without ever throwing. `%` sequences that do not form
 * a valid escape (for example `100%.png`) are kept as-is so the basename rules
 * below still run on the raw text.
 */
function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Resolve `filename` to an absolute path strictly beneath `UPLOAD_DIR`.
 *
 * Returns `null` for anything that is not a safe basename: empty names,
 * traversal segments, separators (raw or percent-encoded), null/control
 * characters, hidden files, or any resolved path that escapes the upload
 * directory.
 */
export function resolveSafeUploadPath(filename: string): string | null {
  if (typeof filename !== "string") {
    return null;
  }

  const decoded = decodeSafely(filename);

  if (decoded.length === 0 || decoded.length > MAX_FILENAME_LENGTH) {
    return null;
  }

  // Reject NUL bytes and every other control character outright.
  if (/[\u0000-\u001f\u007f]/.test(decoded)) {
    return null;
  }

  // No path separators, raw or decoded (`..%2f`, `..\`, etc.).
  if (decoded.includes("/") || decoded.includes("\\")) {
    return null;
  }

  if (decoded.includes("..")) {
    return null;
  }

  if (!SAFE_FILENAME_PATTERN.test(decoded)) {
    return null;
  }

  // Hidden/dotfiles and the bare `.`/`..` segments are never uploads.
  if (decoded.startsWith(".")) {
    return null;
  }

  const root = getUploadRoot();
  const resolved = path.resolve(root, decoded);

  if (!resolved.startsWith(root + path.sep)) {
    return null;
  }

  return resolved;
}

/** Content type for a validated upload, derived only from its extension. */
export function getUploadContentType(
  filename: string,
): string | undefined {
  const extension = path.extname(filename).slice(1).toLowerCase();

  if (!extension) {
    return undefined;
  }

  return EXTENSION_CONTENT_TYPES[
    extension as keyof typeof EXTENSION_CONTENT_TYPES
  ];
}

/** Rewrite a user-supplied name into a short, filesystem-safe stem. */
function toSafeStem(originalName: string): string {
  const stem = path
    .basename(originalName)
    .replace(/\.[^.]*$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 60);

  return stem || "upload";
}

function normalizeMimeType(type: string): UploadMimeType | null {
  const normalized = type.split(";")[0]?.trim().toLowerCase() ?? "";

  return normalized in UPLOAD_MIME_EXTENSIONS
    ? (normalized as UploadMimeType)
    : null;
}

/**
 * Validate and persist an uploaded image.
 *
 * The stored filename is generated from a sanitized stem plus a random UUID, so
 * callers never control the path and concurrent uploads cannot collide. The
 * extension comes from the validated MIME type, never from the original name.
 *
 * @returns the public URL, e.g. `/api/uploads/hero-<uuid>.webp`.
 * @throws {UploadError} when the file type or size is not acceptable.
 */
export async function saveUpload(file: File): Promise<string> {
  if (!(file instanceof File)) {
    throw new UploadError("No file was provided.");
  }

  const mimeType = normalizeMimeType(file.type ?? "");

  if (!mimeType) {
    throw new UploadError(
      "Unsupported file type. Upload a JPEG, PNG, WebP, AVIF, or GIF image.",
    );
  }

  if (file.size === 0) {
    throw new UploadError("The uploaded file is empty.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError("Image is too large. The maximum size is 5 MB.");
  }

  const extension = UPLOAD_MIME_EXTENSIONS[mimeType];
  const filename = `${toSafeStem(file.name)}-${randomUUID()}.${extension}`;
  const filePath = resolveSafeUploadPath(filename);

  // Generated names are always safe; this guards against future edits.
  if (!filePath) {
    throw new UploadError("Could not store the uploaded file.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  try {
    await mkdir(getUploadRoot(), { recursive: true });
    // `wx` fails instead of overwriting if the name somehow already exists.
    await writeFile(filePath, bytes, { flag: "wx" });
  } catch {
    throw new UploadError("Could not store the uploaded file.");
  }

  return `${UPLOAD_URL_PREFIX}${encodeURIComponent(filename)}`;
}
