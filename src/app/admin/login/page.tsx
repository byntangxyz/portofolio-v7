import type { Metadata } from "next";

import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-[var(--bg)] px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
          Admin
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[var(--fg)]">
          Sign in
        </h1>
        <p className="mt-2 mb-8 text-sm leading-relaxed text-[var(--fg-muted)]">
          Enter the admin password to manage projects.
        </p>

        <LoginForm />
      </div>
    </main>
  );
}
