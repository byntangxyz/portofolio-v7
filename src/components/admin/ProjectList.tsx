"use client";

import { type FormEvent, useState, useTransition } from "react";

import {
  deleteProjectAction,
  type DeleteActionState,
} from "@/app/admin/actions";
import type { Project } from "@/db/schema";

import { ProjectForm } from "./ProjectForm";

const initialDeleteState: DeleteActionState = { status: "idle", message: null };

const BUTTON_OUTLINE =
  "h-9 rounded-lg border border-[var(--border-strong)] px-3 text-sm font-medium text-[var(--fg)] outline-none transition-colors hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_DANGER =
  "h-9 rounded-lg bg-white px-3 text-sm font-medium text-black outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60";

type ProjectListProps = {
  projects: Project[];
};

type ProjectRowProps = {
  project: Project;
};

function ProjectRow({ project }: ProjectRowProps) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleteState, setDeleteState] =
    useState<DeleteActionState>(initialDeleteState);
  const [deleting, startDelete] = useTransition();

  function handleDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startDelete(async () => {
      const result = await deleteProjectAction(initialDeleteState, formData);
      setDeleteState(result);

      if (result.status === "success") {
        // The row disappears on revalidation; collapse the prompt meanwhile.
        setConfirming(false);
      }
    });
  }

  return (
    <li className="rounded-lg border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-[-0.01em] text-[var(--fg)]">
              {project.title}
            </h3>
            {project.featured ? (
              <span className="rounded border border-[var(--border)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
                Featured
              </span>
            ) : null}
          </div>

          <p className="mt-1 font-mono text-[11px] tracking-[0.04em] text-[var(--fg-muted)]">
            /{project.slug} · order {project.sortOrder}
          </p>

          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--fg-muted)]">
            {project.summary}
          </p>

          {project.tags.length > 0 ? (
            <p className="mt-2 text-xs text-[var(--fg-muted)]">
              {project.tags.join(" · ")}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              setEditing((value) => !value);
            }}
            aria-expanded={editing}
            aria-controls={`project-edit-${project.id}`}
            className={BUTTON_OUTLINE}
          >
            {editing ? "Close" : "Edit"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setConfirming((value) => !value);
            }}
            aria-expanded={confirming}
            aria-controls={`project-delete-${project.id}`}
            className={BUTTON_OUTLINE}
          >
            Delete
          </button>
        </div>
      </div>

      {confirming ? (
        <div
          id={`project-delete-${project.id}`}
          className="border-t border-[var(--border)] p-5"
        >
          <p className="text-sm leading-relaxed text-[var(--fg)]">
            Delete “{project.title}”? This permanently removes the project and
            cannot be undone.
          </p>

          <form onSubmit={handleDelete} className="mt-4 flex flex-wrap gap-2">
            <input type="hidden" name="id" value={project.id} />
            <button type="submit" disabled={deleting} className={BUTTON_DANGER}>
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className={BUTTON_OUTLINE}
            >
              Cancel
            </button>
          </form>

          {deleteState.message ? (
            <p
              role={deleteState.status === "error" ? "alert" : "status"}
              className="mt-3 text-sm leading-relaxed text-[var(--fg-muted)]"
            >
              {deleteState.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <div
          id={`project-edit-${project.id}`}
          className="border-t border-[var(--border)] p-5"
        >
          <ProjectForm
            key={project.id}
            project={project}
            onSaved={() => setEditing(false)}
          />
        </div>
      ) : null}
    </li>
  );
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center">
        <p className="text-sm font-medium text-[var(--fg)]">No projects yet.</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--fg-muted)]">
          Create the first project with the form below. It will appear on the
          public page once saved.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {projects.map((project) => (
        <ProjectRow key={project.id} project={project} />
      ))}
    </ul>
  );
}
