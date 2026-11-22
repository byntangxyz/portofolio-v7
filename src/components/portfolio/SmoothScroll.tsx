"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Lenis smooth scrolling for the public portfolio only.
 *
 * The scroll loop is driven by `gsap.ticker` so Lenis and every ScrollTrigger
 * share one frame clock; `ScrollTrigger.update` is wired to Lenis's `scroll`
 * event so triggers stay in sync with the smoothed position.
 *
 * Route changes (`/` <-> `/about`) are watched separately: the entrance
 * animations of the old page leave their trigger positions behind, so the new
 * page starts at the top (unless the URL carries a hash) and the triggers are
 * measured again once the new content has painted.
 *
 * Users who prefer reduced motion keep native scrolling: Lenis is never
 * constructed for them, so there is nothing to clean up.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      // The render loop is driven by gsap.ticker below.
      autoRaf: false,
      // Anchor links are handled by the browser's native smooth scrolling,
      // which respects `scroll-padding-top` for the fixed navbar.
      anchors: false,
    });

    lenisRef.current = lenis;

    const onLenisScroll = () => ScrollTrigger.update();
    lenis.on("scroll", onLenisScroll);

    // GSAP's default lag smoothing skips frames after a stall, which makes
    // the smoothed scroll jump; disable it so Lenis keeps a steady clock.
    gsap.ticker.lagSmoothing(0);

    const onTick = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(onTick);

    return () => {
      gsap.ticker.remove(onTick);
      lenis.off("scroll", onLenisScroll);
      lenis.destroy();
      lenisRef.current = null;
      // Restore GSAP's documented defaults so leaving the public page never
      // leaves a globally disabled ticker behind.
      gsap.ticker.lagSmoothing(500, 33);
    };
  }, []);

  useEffect(() => {
    if (previousPathname.current === pathname) return;

    previousPathname.current = pathname;

    // Deep links (`/#work`, `#contact`) keep their intended target; plain
    // route changes start the new page at the top.
    if (!window.location.hash) {
      if (lenisRef.current) {
        lenisRef.current.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo(0, 0);
      }
    }

    // The new route's DOM is committed by the time this effect runs, but
    // fonts and images can still settle; refresh on the next frame and once
    // more after fonts load so scrubbed triggers measure correctly.
    const frame = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) ScrollTrigger.refresh();
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}

export default SmoothScroll;
