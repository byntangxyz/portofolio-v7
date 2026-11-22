import { asc, eq } from "drizzle-orm";

import { db } from "./index";
import { projects, type NewProject, type Project } from "./schema";

/** Fields accepted when creating or editing a project record. */
export type ProjectInput = {
  title: string;
  slug: string;
  summary: string;
  tags?: string[];
  thumbnailUrl?: string | null;
  liveUrl?: string | null;
  repoUrl?: string | null;
  featured?: boolean;
  sortOrder?: number;
};

/**
 * List every project ordered by `sort_order`, then by `created_at` and `id`
 * so the order is stable when several rows share a sort value.
 */
export function listProjects(): Project[] {
  return db
    .select()
    .from(projects)
    .orderBy(asc(projects.sortOrder), asc(projects.createdAt), asc(projects.id))
    .all();
}

export function getProjectById(id: number): Project | undefined {
  return db.select().from(projects).where(eq(projects.id, id)).get();
}

export function createProject(input: ProjectInput): Project {
  const values: NewProject = {
    title: input.title,
    slug: input.slug,
    summary: input.summary,
    tags: input.tags ?? [],
    thumbnailUrl: input.thumbnailUrl ?? null,
    liveUrl: input.liveUrl ?? null,
    repoUrl: input.repoUrl ?? null,
    featured: input.featured ?? false,
    sortOrder: input.sortOrder ?? 0,
  };

  return db.insert(projects).values(values).returning().get();
}

export function updateProject(id: number, input: ProjectInput): Project {
  const values: Partial<NewProject> = {
    title: input.title,
    slug: input.slug,
    summary: input.summary,
    tags: input.tags ?? [],
    thumbnailUrl: input.thumbnailUrl ?? null,
    liveUrl: input.liveUrl ?? null,
    repoUrl: input.repoUrl ?? null,
    featured: input.featured ?? false,
    sortOrder: input.sortOrder ?? 0,
  };

  const updated = db
    .update(projects)
    .set(values)
    .where(eq(projects.id, id))
    .returning()
    .get();

  if (!updated) {
    throw new Error(`Project ${id} not found`);
  }

  return updated;
}

/** Delete a project. Returns whether a row was actually removed. */
export function deleteProject(id: number): boolean {
  const result = db.delete(projects).where(eq(projects.id, id)).run();
  return result.changes > 0;
}
