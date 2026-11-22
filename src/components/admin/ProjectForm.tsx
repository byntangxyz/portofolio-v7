"use client";

import {
  type FormEvent,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  createProjectAction,
  updateProjectAction,
  type ProjectActionState,
} from "@/app/admin/actions";
import type { Project } from "@/db/schema";

const initialState: ProjectActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
};

const INPUT_CLASS =
  "h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-muted)]/60 hover:border-[var(--border-strong)] focus:border-[var(--border-strong)] focus-visible:ring-2 focus-visible:ring-white/40";

const LABEL_CLASS =
  "font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]";

const BUTTON_PRIMARY =
  "h-11 rounded-lg bg-white px-5 text-sm font-medium text-black outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_OUTLINE =
  "h-11 rounded-lg border border-[var(--border-strong)] px-5 text-sm font-medium text-[var(--fg)] outline-none transition-colors hover:bg-white hover:text-black focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60";

type ProjectFormProps = {
  /** Existing project to edit, or `null` to create a new one. */
  project: Project | null;
  /** Called after a successful save so the parent can collapse the edit state. */
  onSaved?: () => void;
};

export function ProjectForm({ project, onSaved }: ProjectFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const idPrefix = useId();
  const isEditing = project !== null;
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [state, setState] = useState<ProjectActionState>(initialState);
  const [pending, startTransition] = useTransition();

  /** Namespaced so the create form and any open edit form never share ids. */
  const fieldId = (name: string) => `${idPrefix}-${name}`;
  const errorId = (name: string) => `${idPrefix}-${name}-error`;
  const hintId = (name: string) => `${idPrefix}-${name}-hint`;

  /**
   * Submit through the Server Action inside a transition so the success side
   * effects (collapse or reset) run in the same async callback rather than an
   * effect that would trigger a cascading render.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const action = isEditing ? updateProjectAction : createProjectAction;

    startTransition(async () => {
      const result = await action(initialState, formData);
      setState(result);

      if (result.status !== "success") {
        return;
      }

      if (isEditing) {
        onSaved?.();
      } else {
        form.reset();
        setFileLabel(null);
      }
    });
  }

  function fieldError(name: string) {
    const message = state.fieldErrors[name]?.[0];

    if (!message) {
      return null;
    }

    return (
      <p id={errorId(name)} className="text-sm text-[var(--fg)]">
        {message}
      </p>
    );
  }

  function describedBy(name: string, hint?: string) {
    const ids = [state.fieldErrors[name] ? errorId(name) : null, hint];

    return ids.filter(Boolean).join(" ") || undefined;
  }

  const thumbnailError = state.fieldErrors.thumbnail_file?.[0];

  return (
    <section
      aria-labelledby={`${idPrefix}-heading`}
      className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 md:p-8"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2
          id={`${idPrefix}-heading`}
          className="text-lg font-semibold tracking-[-0.01em] text-[var(--fg)]"
        >
          {isEditing ? "Edit project" : "New project"}
        </h2>
        {isEditing ? (
          <p className="truncate font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            {project.slug}
          </p>
        ) : null}
      </div>

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        encType="multipart/form-data"
        className="mt-6 flex flex-col gap-5"
      >
        {isEditing ? <input type="hidden" name="id" value={project.id} /> : null}

        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor={fieldId("title")} className={LABEL_CLASS}>
              Title
            </label>
            <input
              id={fieldId("title")}
              name="title"
              type="text"
              required
              maxLength={120}
              defaultValue={project?.title ?? ""}
              aria-invalid={state.fieldErrors.title ? true : undefined}
              aria-describedby={describedBy("title")}
              className={INPUT_CLASS}
            />
            {fieldError("title")}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={fieldId("slug")} className={LABEL_CLASS}>
              Slug
            </label>
            <input
              id={fieldId("slug")}
              name="slug"
              type="text"
              required
              maxLength={80}
              defaultValue={project?.slug ?? ""}
              aria-invalid={state.fieldErrors.slug ? true : undefined}
              aria-describedby={describedBy("slug", hintId("slug"))}
              className={INPUT_CLASS}
            />
            <p id={hintId("slug")} className="text-xs text-[var(--fg-muted)]">
              Lowercase letters, numbers, and single hyphens.
            </p>
            {fieldError("slug")}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId("summary")} className={LABEL_CLASS}>
            Summary
          </label>
          <textarea
            id={fieldId("summary")}
            name="summary"
            required
            rows={3}
            maxLength={400}
            defaultValue={project?.summary ?? ""}
            aria-invalid={state.fieldErrors.summary ? true : undefined}
            aria-describedby={describedBy("summary")}
            className={`${INPUT_CLASS} h-auto resize-y py-3 leading-relaxed`}
          />
          {fieldError("summary")}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={fieldId("tags")} className={LABEL_CLASS}>
            Tags
          </label>
          <input
            id={fieldId("tags")}
            name="tags"
            type="text"
            defaultValue={project?.tags.join(", ") ?? ""}
            aria-invalid={state.fieldErrors.tags ? true : undefined}
            aria-describedby={describedBy("tags", hintId("tags"))}
            className={INPUT_CLASS}
            placeholder="Next.js, TypeScript, SQLite"
          />
          <p id={hintId("tags")} className="text-xs text-[var(--fg-muted)]">
            Comma-separated, up to 12 tags.
          </p>
          {fieldError("tags")}
        </div>

        <fieldset className="flex flex-col gap-3 rounded-lg border border-[var(--border)] p-4">
          <legend className={LABEL_CLASS}>Thumbnail</legend>

          {project?.thumbnailUrl ? (
            <div className="flex items-center gap-4">
              {/* Admin-only preview of an arbitrary admin-supplied URL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.thumbnailUrl}
                alt=""
                className="h-16 w-24 rounded border border-[var(--border)] object-cover"
              />
              <p className="text-xs leading-relaxed text-[var(--fg-muted)]">
                Current image. Leave both fields unchanged to keep it.
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <label htmlFor={fieldId("thumbnail_url")} className={LABEL_CLASS}>
              Image URL
            </label>
            <input
              id={fieldId("thumbnail_url")}
              name="thumbnail_url"
              type="text"
              inputMode="url"
              defaultValue={project?.thumbnailUrl ?? ""}
              aria-invalid={state.fieldErrors.thumbnail_url ? true : undefined}
              aria-describedby={describedBy("thumbnail_url")}
              className={INPUT_CLASS}
              placeholder="https://… or /api/uploads/…"
            />
            {fieldError("thumbnail_url")}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={fieldId("thumbnail_file")} className={LABEL_CLASS}>
              Upload image
            </label>
            <input
              id={fieldId("thumbnail_file")}
              name="thumbnail_file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              onChange={(event) =>
                setFileLabel(event.target.files?.[0]?.name ?? null)
              }
              aria-invalid={thumbnailError ? true : undefined}
              aria-describedby={hintId("thumbnail_file")}
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--fg-muted)] outline-none transition-colors file:mr-3 file:rounded-md file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-black hover:border-[var(--border-strong)] focus-visible:ring-2 focus-visible:ring-white/40"
            />
            <p
              id={hintId("thumbnail_file")}
              className="text-xs text-[var(--fg-muted)]"
            >
              {fileLabel
                ? `Selected: ${fileLabel}. This upload replaces the image URL above.`
                : "JPEG, PNG, WebP, AVIF, or GIF. Up to 5 MB. An upload takes priority over the URL."}
            </p>
            {thumbnailError ? (
              <p className="text-sm text-[var(--fg)]">{thumbnailError}</p>
            ) : null}
          </div>
        </fieldset>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor={fieldId("live_url")} className={LABEL_CLASS}>
              Live URL
            </label>
            <input
              id={fieldId("live_url")}
              name="live_url"
              type="text"
              inputMode="url"
              defaultValue={project?.liveUrl ?? ""}
              aria-invalid={state.fieldErrors.live_url ? true : undefined}
              aria-describedby={describedBy("live_url")}
              className={INPUT_CLASS}
              placeholder="https://…"
            />
            {fieldError("live_url")}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={fieldId("repo_url")} className={LABEL_CLASS}>
              Repository URL
            </label>
            <input
              id={fieldId("repo_url")}
              name="repo_url"
              type="text"
              inputMode="url"
              defaultValue={project?.repoUrl ?? ""}
              aria-invalid={state.fieldErrors.repo_url ? true : undefined}
              aria-describedby={describedBy("repo_url")}
              className={INPUT_CLASS}
              placeholder="https://…"
            />
            {fieldError("repo_url")}
          </div>
        </div>

        <div className="grid items-end gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor={fieldId("sort_order")} className={LABEL_CLASS}>
              Sort order
            </label>
            <input
              id={fieldId("sort_order")}
              name="sort_order"
              type="number"
              step={1}
              defaultValue={project?.sortOrder ?? 0}
              aria-invalid={state.fieldErrors.sort_order ? true : undefined}
              aria-describedby={describedBy("sort_order", hintId("sort_order"))}
              className={INPUT_CLASS}
            />
            <p
              id={hintId("sort_order")}
              className="text-xs text-[var(--fg-muted)]"
            >
              Lower numbers appear first.
            </p>
            {fieldError("sort_order")}
          </div>

          <label
            htmlFor={fieldId("featured")}
            className="flex h-11 items-center gap-3 text-sm text-[var(--fg)]"
          >
            <input
              id={fieldId("featured")}
              name="featured"
              type="checkbox"
              defaultChecked={project?.featured ?? false}
              className="h-4 w-4 rounded border-[var(--border-strong)] accent-white outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            />
            Featured project
          </label>
        </div>

        <p
          aria-live="polite"
          className={
            state.message
              ? "rounded-lg border border-[var(--border)] px-4 py-3 text-sm text-[var(--fg)]"
              : "sr-only"
          }
        >
          {state.message}
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={pending} className={BUTTON_PRIMARY}>
            {pending
              ? "Saving…"
              : isEditing
                ? "Save changes"
                : "Create project"}
          </button>

          {isEditing && onSaved ? (
            <button
              type="button"
              onClick={onSaved}
              disabled={pending}
              className={BUTTON_OUTLINE}
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>
    </section>
  );
}
