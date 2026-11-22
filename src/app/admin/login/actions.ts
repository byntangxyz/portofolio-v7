"use server";

import { redirect } from "next/navigation";

import { createAdminSession, verifyAdminPassword } from "@/lib/admin-auth";

export type LoginState = {
  error: string | null;
};

/**
 * Validate the submitted password server-side, then issue the signed session
 * cookie. `redirect` runs outside the try/catch because it signals by throwing.
 */
export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = formData.get("password");

  if (typeof password !== "string" || password.length === 0) {
    return { error: "Enter the admin password." };
  }

  if (!verifyAdminPassword(password)) {
    return { error: "Incorrect password." };
  }

  const created = await createAdminSession();

  if (!created) {
    return {
      error:
        "Admin login is unavailable: ADMIN_PASSWORD and AUTH_SECRET must be set.",
    };
  }

  redirect("/admin");
}
