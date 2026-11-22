"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";

import { gsap, ScrollTrigger } from "@/lib/gsap";
import type { Project } from "@/db/schema";

/**
 * Asymmetric desktop rhythm from DESIGN.md: rows alternate 5/7 then 7/5.
 * Indexing by `index % 4` keeps the pattern stable as rows are added.
 */
const COLUMN_SPANS = [
  "md:col-span-5",
  "md:col-span-7",
  "md:col-span-7",
  "md:col-span-5",
] as const;

type SelectedWorkProps = {
  projects: Project[];
  databaseError?: boolean;
};

/**
 * Accept only absolute http(s) destinations. Anything malformed or unsafe is
 * dropped instead of being rendered as a live link.
 */
function safeHref(value: string | null): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function ProjectCard({ project, index }: { project: Project; index: number }) {
  const liveHref = safeHref(project.liveUrl);
  const repoHref = safeHref(project.repoUrl);
  const tags = project.tags.filter((tag) => tag.trim().length > 0).slice(0, 3);

  return (
    <article
      // Scroll-triggered entrance target.
      data-work-card
      className={`group relative h-[380px] overflow-hidden rounded-[22px] border border-[var(--border)] bg-[var(--surface)] md:h-[460px] ${COLUMN_SPANS[index % COLUMN_SPANS.length]}`}
    >
      {/*
        Two nested wrappers on purpose:
        - `data-work-parallax` is the GSAP target (scale + yPercent). It is
          slightly taller than the card so the scrubbed travel never exposes
          an edge.
        - the inner wrapper owns the CSS hover scale.
        Keeping them apart stops the two transforms from fighting.
      */}
      <div
        data-work-parallax
        className="absolute inset-x-0 -inset-y-[12%] will-change-transform"
      >
        <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]">
          {project.thumbnailUrl ? (
            // Plain <img>: thumbnails come from `/api/uploads/...` or arbitrary
            // external URLs, so the optimizer is intentionally bypassed.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.thumbnailUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[var(--surface)]">
              <span className="font-serif text-xl text-[var(--fg-muted)]">
                No thumbnail
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom scrim keeps the overlay text legible over any thumbnail. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/75 via-black/20 to-transparent"
      />

      <div className="relative flex h-full flex-col justify-end p-7 md:p-9">
        <h3
          className="line-clamp-2 font-sans font-semibold leading-[1.1] tracking-[-0.03em] text-[var(--fg)]"
          style={{ fontSize: "clamp(1.5rem, 2.2vw, 2.125rem)" }}
        >
          {project.title}
        </h3>

        {/*
          Details are always visible on touch (no hover), and slide in on
          desktop hover or keyboard focus within the card.
        */}
        <div className="mt-3 max-w-xl md:translate-y-2 md:opacity-0 md:transition-[opacity,transform] md:duration-500 md:ease-out md:group-hover:translate-y-0 md:group-hover:opacity-100 md:group-focus-within:translate-y-0 md:group-focus-within:opacity-100">
          {project.summary ? (
            <p className="line-clamp-3 text-sm leading-relaxed text-white/80">
              {project.summary}
            </p>
          ) : null}

          {tags.length > 0 ? (
            <ul className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
              {tags.map((tag) => (
                <li
                  key={tag}
                  className="text-[11px] uppercase tracking-[0.12em] text-white/60"
                >
                  {tag}
                </li>
              ))}
            </ul>
          ) : null}

          {liveHref || repoHref ? (
            <div className="mt-5 flex flex-wrap items-center gap-6">
              {liveHref ? (
                <a
                  href={liveHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[var(--fg)] underline-offset-4 hover:underline"
                >
                  Live site
                  <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}

              {repoHref ? (
                <a
                  href={repoHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[var(--fg)] underline-offset-4 hover:underline"
                >
                  Repository
                  <span aria-hidden="true">↗</span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

/** Section content for `#work`; the page owns the `<section>` wrapper. */
export function SelectedWork({ projects, databaseError = false }: SelectedWorkProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Section intro: the hairline draws itself from the left while the
        // eyebrow settles in, framing the grid before any card moves.
        gsap.from("[data-work-divider]", {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 88%",
            once: true,
          },
        });

        gsap.from("[data-work-eyebrow]", {
          y: 16,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 88%",
            once: true,
          },
        });

        const cards = gsap.utils.toArray<HTMLElement>("[data-work-card]");
        const parallaxLayers = gsap.utils.toArray<HTMLElement>(
          "[data-work-parallax]",
        );

        // Entrance: each card lifts and scales into place on its own trigger,
        // so cards below the fold animate when they actually reach the
        // viewport instead of spending their entrance off-screen.
        cards.forEach((card) => {
          gsap.from(card, {
            y: 64,
            scale: 0.96,
            opacity: 0,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 88%",
              once: true,
            },
          });
        });

        // Parallax: the image layer is oversized so the scrub never exposes
        // an edge. GSAP owns scale + yPercent here; the CSS hover scale lives
        // on a separate inner element.
        parallaxLayers.forEach((layer) => {
          gsap.set(layer, { scale: 1.15 });

          gsap.fromTo(
            layer,
            { yPercent: -10 },
            {
              yPercent: 10,
              ease: "none",
              scrollTrigger: {
                trigger: layer,
                start: "top bottom",
                end: "bottom top",
                scrub: 0.8,
              },
            },
          );
        });

        // Card heights are fixed in CSS, so the layout is stable once the
        // grid mounts. Fonts are the one thing that still settles late and
        // can move the trigger start positions, so refresh once they land.
        let cancelled = false;

        void document.fonts.ready.then(() => {
          if (!cancelled) ScrollTrigger.refresh();
        });

        return () => {
          cancelled = true;
        };
      });

      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [projects] },
  );

  return (
    <div ref={containerRef}>
      <div
        data-work-divider
        aria-hidden="true"
        className="h-px w-full origin-left bg-[var(--border)]"
      />

      <p
        data-work-eyebrow
        className="mt-6 text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]"
      >
        Selected Work
      </p>

      {databaseError ? (
        <div
          role="alert"
          className="mt-8 rounded-[22px] border border-[var(--border-strong)] bg-[var(--surface)] px-6 py-16 text-center"
        >
          <p className="font-serif text-2xl text-[var(--fg)]">
            Projects are temporarily unavailable.
          </p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--fg-muted)]">
            The project database could not be read. Please check back shortly.
          </p>
        </div>
      ) : projects.length === 0 ? (
        <div
          role="status"
          className="mt-8 rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center"
        >
          <p className="font-serif text-2xl text-[var(--fg)]">No projects yet.</p>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--fg-muted)]">
            Published projects will appear here once they are added in the
            admin.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-12">
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Suspense fallback. Card heights mirror the real cards so swapping in the
 * data does not shift the layout.
 */
export function SelectedWorkSkeleton() {
  return (
    <div>
      <div aria-hidden="true" className="h-px w-full bg-[var(--border)]" />
      <p className="mt-6 text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
        Selected Work
      </p>
      <div
        aria-hidden="true"
        className="mt-8 grid animate-pulse grid-cols-1 gap-6 md:grid-cols-12"
      >
        <div className="h-[380px] rounded-[22px] border border-[var(--border)] bg-[var(--surface)] md:col-span-5 md:h-[460px]" />
        <div className="h-[380px] rounded-[22px] border border-[var(--border)] bg-[var(--surface)] md:col-span-7 md:h-[460px]" />
      </div>
      <span className="sr-only">Loading selected work…</span>
    </div>
  );
}

export default SelectedWork;
