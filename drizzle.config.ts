import { defineConfig } from "drizzle-kit";

// The database URL is read from the environment at CLI time; no secret is
// committed. Keep the fallback aligned with `src/db/index.ts`.
const databaseUrl = process.env.DATABASE_URL ?? "./data/portfolio.db";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});
