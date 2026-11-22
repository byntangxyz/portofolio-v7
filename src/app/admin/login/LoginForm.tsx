"use client";

import { useActionState } from "react";

import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
          className="h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--fg)] outline-none transition-colors focus:border-[var(--border-strong)] focus-visible:ring-2 focus-visible:ring-white/40"
        />
      </div>

      {state.error ? (
        <p
          id="login-error"
          role="alert"
          className="text-sm leading-relaxed text-[var(--fg-muted)]"
        >
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-lg bg-white text-sm font-medium text-black outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
