import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { logout } from "./actions";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { ProjectList } from "@/components/admin/ProjectList";
import { listProjects } from "@/db/projects";
import type { Project } from "@/db/schema";

export const metadata: Metadata = {
  title: "Projects — Admin",
  robots: { index: false, follow: false },
};

type ProjectsResult =
  | { status: "ok"; projects: Project[] }
  | { status: "error"; message: string };

/**
 * Read the project list, converting database failures into an explicit state
 * instead of letting the whole admin page crash.
 *
 * `connection()` runs before the synchronous SQLite read so the list is never
 * frozen into the prerendered shell.
 */
async function loadProjects(): Promise<ProjectsResult> {
  await connection();

  try {
    return { status: "ok", projects: listProjects() };
  } catch (error) {
    console.error("Failed to list projects", error);

    return {
      status: "error",
      message:
        "The project database could not be read. Check DATABASE_URL and the migrations, then reload.",
    };
  }
}

function ProjectsErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-6 py-8"
    >
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
        Database error
      </p>
      <p className="mt-3 text-sm leading-relaxed text-[var(--fg)]">{message}</p>
    </div>
  );
}

function ProjectsLoading() {
  return (
    <p
      aria-live="polite"
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center text-sm text-[var(--fg-muted)]"
    >
      Loading projects…
    </p>
  );
}

async function ProjectsSection() {
  const result = await loadProjects();

  if (result.status === "error") {
    return <ProjectsErrorState message={result.message} />;
  }

  return <ProjectList projects={result.projects} />;
}

export default function AdminPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12 md:py-16">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] pb-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            Admin
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-[var(--fg)]">
            Projects
          </h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--fg-muted)]">
            Create, edit, and remove the projects shown on the public page.
          </p>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="h-9 rounded-lg border border-[var(--border-strong)] px-3 text-sm font-medium text-[var(--fg)] outline-none transition-colors hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="mt-8 flex flex-col gap-10">
        <Suspense fallback={<ProjectsLoading />}>
          <ProjectsSection />
        </Suspense>

        <ProjectForm project={null} />
      </div>
    </main>
  );
}
