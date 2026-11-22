import { connection } from "next/server";
import { Suspense } from "react";

import { Hero } from "@/components/portfolio/Hero";
import { SelectedWork, SelectedWorkSkeleton } from "@/components/portfolio/SelectedWork";
import { listProjects } from "@/db/projects";
import type { Project } from "@/db/schema";

/**
 * Reads the project list at request time.
 *
 * `connection()` lives here, inside the Suspense boundary, so it does not
 * block prerendering of the rest of the page. `better-sqlite3` is synchronous,
 * so the query resolves during SSR and streams into the static shell.
 */
async function SelectedWorkLoader() {
  await connection();

  let projects: Project[] = [];
  let databaseError = false;

  try {
    projects = listProjects();
  } catch (error) {
    databaseError = true;
    console.error("Failed to load projects for the public page", error);
  }

  return <SelectedWork projects={projects} databaseError={databaseError} />;
}

export default function Home() {
  return (
    <>
      <Hero />

      <section
        id="work"
        aria-label="Selected work"
        className="mx-auto w-full max-w-[1280px] px-6 pb-32 md:px-10"
      >
        <Suspense fallback={<SelectedWorkSkeleton />}>
          <SelectedWorkLoader />
        </Suspense>
      </section>
    </>
  );
}
