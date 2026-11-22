"use client";

import { useGSAP } from "@gsap/react";
import { usePathname } from "next/navigation";
import { useRef } from "react";

import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Minimal OLED scroll rail.
 *
 * A 2px track pinned to the right edge with a white fill that scales open from
 * the top as the document is scrolled (`scaleY: 0 -> 1`, scrubbed). Only the
 * composited `scaleY` is tweened.
 *
 * `usePathname` is a dependency so `/` <-> `/about` navigation rebuilds the
 * ScrollTrigger against the new document height instead of keeping the old
 * route's `end` measurement. Reduced-motion users never construct the tween.
 */
export function ScrollProgress() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      const media = gsap.matchMedia();

      media.add("(prefers-reduced-motion: no-preference)", () => {
        const fill = containerRef.current?.querySelector<HTMLElement>(
          "[data-sp-fill]",
        );
        if (!fill) return;

        const tween = gsap.fromTo(
          fill,
          { scaleY: 0, transformOrigin: "top center" },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              start: 0,
              end: "max",
              scrub: 0.2,
            },
          },
        );

        // The new route's DOM is committed by now, but fonts and images can
        // still settle; measure again on the next frame.
        const frame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

        return () => {
          window.cancelAnimationFrame(frame);
          tween.scrollTrigger?.kill();
          tween.kill();
        };
      });

      return () => media.revert();
    },
    { scope: containerRef, dependencies: [pathname] },
  );

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed top-1/2 right-3 z-40 hidden h-28 w-[2px] -translate-y-1/2 overflow-hidden bg-white/10 md:block"
    >
      <div
        data-sp-fill
        className="h-full w-full origin-top scale-y-0 bg-white will-change-transform"
      />
    </div>
  );
}

export default ScrollProgress;
