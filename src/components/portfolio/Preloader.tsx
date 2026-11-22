"use client";

import { useGSAP } from "@gsap/react";
import { useRef, useState } from "react";

import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Choreographed editorial intro. Three stages, ~3.05s total:
 *   0.00–0.60  monogram / status meta rise out of their masks, hairline track
 *              scales open from the centre.
 *   0.30–2.20  tabular counter 00 → 100 synced with the white progress fill;
 *              CODE → SYSTEMS → BINTANG cycle strictly one at a time through a
 *              single overflow mask. Each word exits before the next enters.
 *   2.20–3.05  counter / words / track fade upward, then the black backdrop
 *              splits into two half-screen panels and the Hero shows through.
 *              The overlay unmounts the moment the timeline completes.
 *
 * Only `x` / `y` / `scale` / `opacity` are tweened. The one exception is the
 * counter's text value, which is written on GSAP's own tick.
 *
 * The overlay is rendered on the server exactly as it is on the client, so
 * hydration is a no-op. Reduced-motion users get the CSS `motion-reduce:hidden`
 * state and the component unmounts immediately after mount.
 */
const WORDS = ["CODE", "SYSTEMS", "BINTANG"] as const;

const COUNTER_START = 0.3;
const COUNTER_END = 2.2;
const EXIT_START = 2.2;

// Each word owns the mask exclusively: it enters, holds, exits, and only then
// does the next one enter. Nothing overlaps at any point on the timeline.
const WORD_ENTER = 0.3;
const WORD_HOLD = 0.15;
const WORD_EXIT = 0.25;
const WORD_STEP = WORD_ENTER + WORD_HOLD + WORD_EXIT;

export function Preloader() {
  const containerRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(true);

  useGSAP(
    () => {
      if (!active) return;

      const overlay = containerRef.current;
      if (!overlay) return;

      const root = document.documentElement;
      const previousOverflow = root.style.overflow;

      // Scroll is frozen while the curtain is closed.
      root.style.overflow = "hidden";

      const restoreScroll = () => {
        root.style.overflow = previousOverflow;
      };

      const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      if (prefersReducedMotion) {
        restoreScroll();
        setActive(false);
        requestAnimationFrame(() => ScrollTrigger.refresh());
        return;
      }

      const counter = { value: 0 };
      const counterEl = counterRef.current;

      // Every word starts fully below the mask and invisible, so the three
      // absolutely-stacked spans never paint on top of each other on mount.
      const words = gsap.utils.toArray<HTMLElement>("[data-pl-word]", overlay);
      gsap.set(words, { yPercent: 110, autoAlpha: 0 });

      const timeline = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: () => {
          restoreScroll();
          // Hide the last painted frame before React drops the overlay so not
          // even a stray sub-pixel edge can sit over the Hero.
          gsap.set(overlay, { autoAlpha: 0 });
          setActive(false);
          // Measure the hero only after the overlay has left the tree.
          requestAnimationFrame(() => ScrollTrigger.refresh());
        },
      });

      // Stage 1 — intro & corner meta.
      timeline
        .fromTo(
          "[data-pl-meta]",
          { yPercent: 100 },
          { yPercent: 0, duration: 0.6, stagger: 0.06 },
          0,
        )
        .fromTo(
          "[data-pl-track]",
          { scaleX: 0 },
          { scaleX: 1, duration: 0.6, ease: "power2.out" },
          0,
        );

      // Stage 2 — counter, progress fill and cycling words.
      timeline
        .to(
          counter,
          {
            value: 100,
            duration: COUNTER_END - COUNTER_START,
            ease: "power2.inOut",
            onUpdate: () => {
              if (!counterEl) return;
              counterEl.textContent = String(
                Math.round(counter.value),
              ).padStart(2, "0");
            },
          },
          COUNTER_START,
        )
        .fromTo(
          "[data-pl-bar]",
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: COUNTER_END - COUNTER_START,
            ease: "power2.inOut",
          },
          COUNTER_START,
        );

      WORDS.forEach((_, index) => {
        const at = COUNTER_START + index * WORD_STEP;
        const isLast = index === WORDS.length - 1;

        timeline
          .fromTo(
            `[data-pl-word="${index}"]`,
            { yPercent: 110, autoAlpha: 0 },
            { yPercent: 0, autoAlpha: 1, duration: WORD_ENTER, ease: "power3.out" },
            at,
          );

        // The final word holds through the Stage 3 fade-out. Every other word
        // exits before its successor is allowed to enter.
        if (!isLast) {
          timeline.to(
            `[data-pl-word="${index}"]`,
            {
              yPercent: -110,
              autoAlpha: 0,
              duration: WORD_EXIT,
              ease: "power3.in",
            },
            at + WORD_ENTER + WORD_HOLD,
          );
        }
      });

      // Stage 3 — content exits upward, then the two panels part.
      timeline
        .to(
          "[data-pl-exit]",
          { y: -24, opacity: 0, duration: 0.35, stagger: 0.04, ease: "power2.in" },
          EXIT_START,
        )
        // The panels carry the black canvas from here on, so the wrapper's
        // background must stop covering the Hero as they separate.
        .set(overlay, { backgroundColor: "transparent", pointerEvents: "none" }, EXIT_START)
        .to(
          "[data-pl-panel-top]",
          { yPercent: -100, duration: 0.85, ease: "power4.inOut" },
          EXIT_START,
        )
        .to(
          "[data-pl-panel-bottom]",
          { yPercent: 100, duration: 0.85, ease: "power4.inOut" },
          EXIT_START,
        );

      // If the route changes mid-run, never leave the page scroll-locked.
      return restoreScroll;
    },
    { scope: containerRef, dependencies: [active] },
  );

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="fixed inset-0 z-[100] overflow-hidden bg-black motion-reduce:hidden"
    >
      {/* Split OLED backdrop. Two butt-jointed halves, no seam line. */}
      <div
        data-pl-panel-top
        className="absolute inset-x-0 top-0 h-1/2 bg-black will-change-transform"
      />
      <div
        data-pl-panel-bottom
        className="absolute inset-x-0 bottom-0 h-1/2 bg-black will-change-transform"
      />

      <div className="relative z-10 h-full">
        {/* Stage 1 — corner meta, each line masked. The row itself lifts away
            with the rest of the content during the exit. */}
        <div
          data-pl-exit
          className="absolute inset-x-0 top-0 flex items-start justify-between px-6 py-6 md:px-10 md:py-8"
        >
          <span className="block overflow-hidden">
            <span
              data-pl-meta
              className="block will-change-transform text-sm font-semibold tracking-[0.02em] text-[var(--fg)]"
              style={{ transform: "translateY(100%)" }}
            >
              BM
            </span>
          </span>

          <span className="block overflow-hidden">
            <span
              data-pl-meta
              className="block will-change-transform text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]"
              style={{ transform: "translateY(100%)" }}
            >
              Portfolio / 2026
            </span>
          </span>
        </div>

        {/* Centre composition. */}
        <div className="flex h-full flex-col items-center justify-center gap-6 px-6">
          <div data-pl-exit className="flex items-baseline justify-center">
            {/* Fixed three-cell width so the 00 → 100 roll-up never nudges the
                centred composition or the trailing `%`. */}
            <span
              ref={counterRef}
              className="inline-block w-[3ch] text-center will-change-transform font-sans text-[clamp(3.5rem,9vw,7rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums text-[var(--fg)]"
            >
              00
            </span>
            <span
              aria-hidden="true"
              className="ml-1 text-[clamp(1rem,2vw,1.5rem)] font-medium text-[var(--fg-muted)]"
            >
              %
            </span>
          </div>

          {/* Stage 2 — one mask, three words. Each word is layered in the same
              cell but starts at opacity 0, so nothing stacks on first paint. */}
          <div
            data-pl-exit
            className="relative h-12 w-full overflow-hidden"
          >
            {WORDS.map((word, index) => (
              <span
                key={word}
                data-pl-word={index}
                className="absolute inset-0 flex items-center justify-center opacity-0 will-change-transform font-serif text-[clamp(2rem,4.5vw,3.25rem)] uppercase tracking-[-0.01em] text-[var(--fg)]"
              >
                {word}
              </span>
            ))}
          </div>

          {/* Hairline rail (Stage 1) + white fill (Stage 2). The exit tween
              lifts the wrapper so the track keeps its own scaleX tween. */}
          <div data-pl-exit className="flex w-full justify-center">
            <div
              data-pl-track
              className="relative h-px w-[min(60vw,320px)] origin-center bg-[var(--border)] will-change-transform"
              style={{ transform: "scaleX(0)" }}
            >
              <span
                data-pl-bar
                className="absolute inset-0 origin-left bg-[var(--fg)] will-change-transform"
                style={{ transform: "scaleX(0)" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Preloader;
