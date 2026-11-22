import type { ReactNode } from "react";

import { Contact } from "@/components/portfolio/Contact";
import { Navbar } from "@/components/portfolio/Navbar";
import { Preloader } from "@/components/portfolio/Preloader";
import { ScrollProgress } from "@/components/portfolio/ScrollProgress";
import { SmoothScroll } from "@/components/portfolio/SmoothScroll";

/**
 * Shared chrome for every public route (`/` and `/about`).
 *
 * `SmoothScroll`, `Navbar` and `Preloader` live here so client-side navigation
 * between the two pages never tears them down: the intro curtain plays once on
 * the first public load and does not re-run when moving between routes. `/admin`
 * sits outside this group and keeps its own chrome-free layout.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Preloader />
      <SmoothScroll />
      <ScrollProgress />
      <Navbar />

      <main id="top" className="flex flex-1 flex-col">
        {children}
      </main>

      <footer
        id="contact"
        aria-label="Contact"
        className="mx-auto w-full max-w-[1280px] px-6 pb-16 md:px-10"
      >
        <Contact />
      </footer>
    </>
  );
}
