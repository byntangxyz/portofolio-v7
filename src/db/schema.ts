import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Single source of truth for portfolio projects.
 *
 * Column names stay snake_case in SQLite; TypeScript properties use camelCase.
 * `tags` is stored as a JSON-encoded text array, `featured` as a 0/1 integer
 * exposed as a boolean, and `created_at` as a Unix epoch second timestamp.
 */
export const projects = sqliteTable("projects", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary").notNull(),
  tags: text("tags", { mode: "json" })
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'`),
  thumbnailUrl: text("thumbnail_url"),
  liveUrl: text("live_url"),
  repoUrl: text("repo_url"),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
