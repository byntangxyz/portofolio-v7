"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  createProject,
  deleteProject,
  getProjectById,
  updateProject,
  type ProjectInput,
} from "@/db/projects";
import { clearAdminSession, verifyAdminSession } from "@/lib/admin-auth";
import {
  UPLOAD_URL_PREFIX,
  UploadError,
  resolveSafeUploadPath,
  saveUpload,
} from "@/lib/uploads";

/** Field errors keyed by form field name, e.g. `{ slug: ["…"] }`. */
export type FieldErrors = Record<string, string[]>;

export type ProjectActionState = {
  status: "idle" | "error" | "success";
  message: string | null;
  fieldErrors: FieldErrors;
};

export type DeleteActionState = {
  status: "idle" | "error" | "success";
  message: string | null;
};

const SESSION_EXPIRED_MESSAGE =
  "Your session has expired. Sign in again to continue.";

function actionError(
  message: string,
  fieldErrors: FieldErrors = {},
): ProjectActionState {
  return { status: "error", message, fieldErrors };
}

function actionSuccess(message: string): ProjectActionState {
  return { status: "success", message, fieldErrors: {} };
}

/**
 * Normalize the two invocation shapes a Server Action can receive.
 *
 * The client calls `(previousState, formData)`, while a plain form POST passes
 * the `FormData` as the first argument. Accepting both keeps a direct POST from
 * crashing on `undefined`.
 */
function resolveFormData(
  stateOrData: ProjectActionState | DeleteActionState | FormData | undefined,
  maybeData: FormData | undefined,
): FormData | null {
  if (maybeData instanceof FormData) {
    return maybeData;
  }

  if (stateOrData instanceof FormData) {
    return stateOrData;
  }

  return null;
}

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

/** Read a positive integer id from the form, or `null` when it is malformed. */
function readId(formData: FormData): number | null {
  const value = readString(formData, "id");

  if (value.trim() === "") {
    return null;
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Accept only absolute `http:`/`https:` URLs. Rejects `javascript:`, `data:`, etc. */
function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Accept an internal upload URL such as `/api/uploads/name.webp`.
 *
 * The filename must pass the same basename rules the upload storage uses, so
 * `javascript:`-style values, encoded separators, and traversal segments can
 * never be stored as a thumbnail path.
 */
function isInternalUploadUrl(value: string): boolean {
  if (!value.startsWith(UPLOAD_URL_PREFIX)) {
    return false;
  }

  const encodedName = value.slice(UPLOAD_URL_PREFIX.length);

  if (
    encodedName === "" ||
    encodedName.includes("/") ||
    encodedName.includes("\\") ||
    encodedName.includes("?") ||
    encodedName.includes("#")
  ) {
    return false;
  }

  let decodedName: string;

  try {
    decodedName = decodeURIComponent(encodedName);
  } catch {
    return false;
  }

  return resolveSafeUploadPath(decodedName) !== null;
}

const httpUrlField = (label: string) =>
  z
    .string()
    .trim()
    .max(2048, { error: `${label} must be 2048 characters or fewer.` })
    .refine((value) => value === "" || isHttpUrl(value), {
      error: `${label} must be an http:// or https:// URL.`,
    })
    .transform((value) => (value === "" ? null : value));

const thumbnailUrlField = z
  .string()
  .trim()
  .max(2048, { error: "Thumbnail URL must be 2048 characters or fewer." })
  .refine(
    (value) =>
      value === "" || isHttpUrl(value) || isInternalUploadUrl(value),
    {
      error:
        "Thumbnail URL must be an http:// or https:// URL or an /api/uploads/ path.",
    },
  )
  .transform((value) => (value === "" ? null : value));

const tagsField = z
  .string()
  .trim()
  .max(400, { error: "Tags must be 400 characters or fewer." })
  .transform((value) =>
    value
      .split(/[,\n]/)
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0),
  )
  .pipe(
    z
      .array(
        z
          .string()
          .max(40, { error: "Each tag must be 40 characters or fewer." }),
      )
      .max(12, { error: "Use 12 tags or fewer." }),
  )
  .transform((tags) => [...new Set(tags)]);

const sortOrderField = z.preprocess((value) => {
  if (typeof value !== "string" || value.trim() === "") {
    return 0;
  }

  return Number(value);
}, z
  .number({ error: "Sort order must be a whole number." })
  .int({ error: "Sort order must be a whole number." })
  .min(-9999, { error: "Sort order must be -9999 or greater." })
  .max(9999, { error: "Sort order must be 9999 or less." }));

const projectSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: "Enter a project title." })
    .max(120, { error: "Title must be 120 characters or fewer." }),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, { error: "Enter a slug." })
    .max(80, { error: "Slug must be 80 characters or fewer." })
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      error:
        "Use lowercase letters, numbers, and single hyphens (for example: my-project).",
    }),
  summary: z
    .string()
    .trim()
    .min(1, { error: "Enter a short summary." })
    .max(400, { error: "Summary must be 400 characters or fewer." }),
  tags: tagsField,
  thumbnail_url: thumbnailUrlField,
  live_url: httpUrlField("Live URL"),
  repo_url: httpUrlField("Repository URL"),
  featured: z.boolean(),
  sort_order: sortOrderField,
});

function normalizeFieldErrors(
  fieldErrors: Record<string, string[] | undefined>,
): FieldErrors {
  const normalized: FieldErrors = {};

  for (const [field, messages] of Object.entries(fieldErrors)) {
    if (messages && messages.length > 0) {
      normalized[field] = messages;
    }
  }

  return normalized;
}

/** Detect a duplicate-slug insert/update without matching unrelated errors. */
function isUniqueSlugError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as { code?: unknown }).code;

  return (
    code === "SQLITE_CONSTRAINT_UNIQUE" ||
    error.message.includes("UNIQUE constraint failed: projects.slug")
  );
}

async function persistProject(
  id: number | null,
  formData: FormData,
): Promise<ProjectActionState> {
  const parsed = projectSchema.safeParse({
    title: readString(formData, "title"),
    slug: readString(formData, "slug"),
    summary: readString(formData, "summary"),
    tags: readString(formData, "tags"),
    thumbnail_url: readString(formData, "thumbnail_url"),
    live_url: readString(formData, "live_url"),
    repo_url: readString(formData, "repo_url"),
    featured: formData.get("featured") === "on",
    sort_order: readString(formData, "sort_order"),
  });

  if (!parsed.success) {
    return actionError(
      "Fix the highlighted fields and try again.",
      normalizeFieldErrors(z.flattenError(parsed.error).fieldErrors),
    );
  }

  const data = parsed.data;

  // Read the row before uploading so a stale id cannot leave orphaned files.
  const existing = id === null ? undefined : getProjectById(id);

  if (id !== null && !existing) {
    return actionError("That project no longer exists. Reload the page.");
  }

  let thumbnailUrl: string | null = data.thumbnail_url;
  const file = formData.get("thumbnail_file");

  if (file instanceof File && file.size > 0) {
    try {
      thumbnailUrl = await saveUpload(file);
    } catch (error) {
      const message =
        error instanceof UploadError
          ? error.message
          : "The image could not be uploaded.";

      console.error("Failed to save project thumbnail", error);

      return actionError(message, { thumbnail_file: [message] });
    }
  } else if (!formData.has("thumbnail_url") && existing) {
    // A crafted submission without the field keeps the stored image.
    thumbnailUrl = existing.thumbnailUrl;
  }

  const input: ProjectInput = {
    title: data.title,
    slug: data.slug,
    summary: data.summary,
    tags: data.tags,
    thumbnailUrl,
    liveUrl: data.live_url,
    repoUrl: data.repo_url,
    featured: data.featured,
    sortOrder: data.sort_order,
  };

  try {
    if (id === null) {
      createProject(input);
    } else {
      updateProject(id, input);
    }
  } catch (error) {
    if (isUniqueSlugError(error)) {
      const message = "That slug is already in use. Choose a different slug.";

      return actionError(message, { slug: [message] });
    }

    console.error("Failed to save project", error);

    return actionError(
      "The project could not be saved. Check the database and try again.",
    );
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return actionSuccess(id === null ? "Project created." : "Project saved.");
}

/** Create a project. Requires a valid admin session. */
export async function createProjectAction(
  previousState: ProjectActionState,
  formData?: FormData,
): Promise<ProjectActionState> {
  if (!(await verifyAdminSession())) {
    return actionError(SESSION_EXPIRED_MESSAGE);
  }

  const data = resolveFormData(previousState, formData);

  if (!data) {
    return actionError("The form could not be read. Reload and try again.");
  }

  return persistProject(null, data);
}

/** Update an existing project. Requires a valid admin session. */
export async function updateProjectAction(
  previousState: ProjectActionState,
  formData?: FormData,
): Promise<ProjectActionState> {
  if (!(await verifyAdminSession())) {
    return actionError(SESSION_EXPIRED_MESSAGE);
  }

  const data = resolveFormData(previousState, formData);

  if (!data) {
    return actionError("The form could not be read. Reload and try again.");
  }

  const id = readId(data);

  if (id === null) {
    return actionError("Choose a valid project to update.");
  }

  return persistProject(id, data);
}

/** Delete a project. Requires a valid admin session. */
export async function deleteProjectAction(
  previousState: DeleteActionState,
  formData?: FormData,
): Promise<DeleteActionState> {
  if (!(await verifyAdminSession())) {
    return { status: "error", message: SESSION_EXPIRED_MESSAGE };
  }

  const data = resolveFormData(previousState, formData);

  if (!data) {
    return { status: "error", message: "The form could not be read. Reload and try again." };
  }

  const id = readId(data);

  if (id === null) {
    return { status: "error", message: "Choose a valid project to delete." };
  }

  let deleted: boolean;

  try {
    deleted = deleteProject(id);
  } catch (error) {
    console.error("Failed to delete project", error);

    return {
      status: "error",
      message: "The project could not be deleted. Check the database and try again.",
    };
  }

  if (!deleted) {
    return { status: "error", message: "That project no longer exists." };
  }

  revalidatePath("/");
  revalidatePath("/admin");

  return { status: "success", message: "Project deleted." };
}

/**
 * Clear the admin session cookie and return to the login page.
 *
 * Usable directly as a `<form action>`. The cookie is cleared even when the
 * session is already invalid so a stale cookie cannot linger.
 */
export async function logout(): Promise<void> {
  await verifyAdminSession();
  await clearAdminSession();

  redirect("/admin/login");
}
