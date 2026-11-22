"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";

import { gsap } from "@/lib/gsap";

const HEADING = "Hello";

/**
 * Centered opening statement. Facts only: the name comes from the project
 * brief; role and focus match the verified copy used by `AboutAndStack`.
 *
 * Motion has two separate owners so transforms never fight:
 * - entrance: per-character masks (`yPercent`) then the name/role lines (`y`).
 * - exit: a scrubbed parallax on `[data-hero-parallax]` that also fades the
 *   block as `#work` comes up, so the hand-off feels continuous.
 *
 * Everything is scoped to this section and gated on
 * `prefers-reduced-motion: no-preference`; with motion reduced the copy is
 * rendered fully visible and unanimated.
 */
export function Hero() {
  const containerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const timeline = gsap.timeline();

        timeline
          // Characters slide up out of their masks. The mask itself handles
          // the reveal, so no opacity is needed on the glyphs.
          .from("[data-hero-char]", {
            yPercent: 110,
            duration: 0.9,
            stagger: 0.045,
            ease: "power4.out",
          })
          // Name and role arrive crisply once the headline has landed.
          .from(
            "[data-hero-line]",
            {
              y: 24,
              opacity: 0,
              duration: 0.7,
              stagger: 0.12,
              ease: "power3.out",
            },
            "-=0.5",
          );

        // Scrub the whole block up and out of the way as the work section
        // rises into view. Paired with the fixed hero height this reads as one
        // continuous vertical move rather than a hard section boundary.
        gsap.fromTo(
          "[data-hero-parallax]",
          { y: 0, opacity: 1 },
          {
            y: -48,
            opacity: 0.25,
            ease: "none",
            scrollTrigger: {
              trigger: containerRef.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          },
        );
      });

      return () => mm.revert();
    },
    { scope: containerRef },
  );

  return (
    <section
      ref={containerRef}
      aria-labelledby="hero-heading"
      className="flex min-h-[72vh] flex-col items-center justify-center px-6 pt-20 text-center"
    >
      <div data-hero-parallax className="flex flex-col items-center will-change-transform">
        <h1
          id="hero-heading"
          className="font-sans font-bold leading-[0.95] tracking-[-0.045em] text-[var(--fg)]"
          style={{ fontSize: "clamp(4.5rem, 13vw, 10.5rem)" }}
        >
          {/* Each character gets its own mask so it can slide up from below. */}
          <span className="sr-only">{HEADING}</span>
          <span aria-hidden="true" className="inline-flex">
            {HEADING.split("").map((char, index) => (
              <span
                key={`${char}-${index}`}
                className="inline-block overflow-hidden"
              >
                <span data-hero-char className="inline-block will-change-transform">
                  {char}
                </span>
              </span>
            ))}
          </span>
        </h1>

        <p
          data-hero-line
          className="mt-6 text-[var(--fg)]"
          style={{ fontSize: "clamp(1rem, 1.4vw, 1.25rem)" }}
        >
          Bintang Murtifandy
        </p>

        <p
          data-hero-line
          className="mt-2 max-w-xl leading-relaxed text-[var(--fg-muted)]"
          style={{ fontSize: "clamp(1rem, 1.4vw, 1.25rem)" }}
        >
          Full-Stack Developer &amp; Network Engineer
          <span aria-hidden="true"> · </span>
          Building web applications and self-hosted infrastructure
        </p>
      </div>
    </section>
  );
}

export default Hero;
