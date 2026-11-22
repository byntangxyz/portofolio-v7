import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import path from "path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "./schema";

const DEFAULT_DATABASE_URL = "./data/portfolio.db";

/**
 * Server-only SQLite connection.
 *
 * The file path comes from `DATABASE_URL`; the local default exists so `dev`
 * and `build` work before an environment file is prepared. Never import this
 * module from a Client Component.
 */
function createDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;

  // `:memory:` has no parent directory to create.
  if (databaseUrl !== ":memory:") {
    const filePath = resolve(process.cwd(), databaseUrl);
    mkdirSync(dirname(filePath), { recursive: true });
    const sqlite = new Database(filePath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    return drizzle(sqlite, { schema });
  }

  return drizzle(new Database(databaseUrl), { schema });
}

// Reuse the connection across hot reloads in development.
const globalForDb = globalThis as unknown as {
  portfolioDb?: ReturnType<typeof createDatabase>;
};

export const db = globalForDb.portfolioDb ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
  globalForDb.portfolioDb = db;
}

migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

export { schema };
