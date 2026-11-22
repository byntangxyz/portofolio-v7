"use client";

import { useGSAP } from "@gsap/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { gsap } from "@/lib/gsap";

const NAV_LINKS = [
  { label: "Projects", href: "/" },
  { label: "About", href: "/about" },
] as const;

// The overlay also exposes the footer's contact anchor, which the desktop bar
// leaves out.
const MOBILE_LINKS = [
  ...NAV_LINKS,
  { label: "Contact", href: "/#contact" },
] as const;

const isActiveHref = (href: string, pathname: string) =>
  href === "/about" && pathname === "/about";

const PANEL_SELECTOR = "[data-menu-panel]";
const LINK_SELECTOR = "[data-menu-link]";

/**
 * Fixed bar plus a full-screen mobile menu.
 *
 * The overlay renders as a sibling of `<header>` (not a child) so the z-order
 * is explicit: the bar sits at `z-50`, the curtain at `z-40`. It is two
 * butt-jointed OLED panels — the top half slides down, the bottom half slides
 * up — and the editorial links rise out of their own masks once the panels
 * meet.
 *
 * The animation is driven imperatively from an `isOpen` effect rather than a
 * `useGSAP` dependency: `useGSAP` would revert the context on every toggle and
 * snap the curtain back to its hidden state before it could ever be seen. Each
 * run first kills any in-flight tweens, so a fast open/close/open never leaves
 * two animations fighting over the same transforms.
 *
 * Only `yPercent` / `opacity` are tweened, and with
 * `prefers-reduced-motion: reduce` the menu simply appears and disappears.
 */
export function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const hasOpenedRef = useRef(false);

  // Close the mobile menu when the route changes. Adjusting state during
  // render (rather than in an effect) avoids a cascading re-render, and the
  // mobile links also close the menu on click for immediate feedback.
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setIsOpen(false);
  }

  // Closed baseline, applied once before the first paint. Scope-bound with no
  // dependencies, so `isOpen` toggles never trigger a revert.
  useGSAP(
    () => {
      const overlay = overlayRef.current;
      if (!overlay) return;

      const panels = overlay.querySelectorAll<HTMLElement>(PANEL_SELECTOR);
      const links = overlay.querySelectorAll<HTMLElement>(LINK_SELECTOR);

      gsap.set(overlay, { visibility: "hidden", pointerEvents: "none" });
      gsap.set(panels, {
        yPercent: (index) => (index === 0 ? -100 : 100),
      });
      gsap.set(links, { yPercent: 110, opacity: 0 });
    },
    { scope: overlayRef },
  );

  // Open / close choreography. Explicit `gsap.to` calls with their own
  // cleanup, so the overlay always ends in a deterministic state.
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return;

    const panels = gsap.utils.toArray<HTMLElement>(PANEL_SELECTOR, overlay);
    const links = gsap.utils.toArray<HTMLElement>(LINK_SELECTOR, overlay);
    const targets = [overlay, ...panels, ...links];

    // Nothing has been opened yet, so the overlay already sits in its closed
    // baseline; the first open is what starts the choreography.
    if (!isOpen && !hasOpenedRef.current) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let cancelled = false;

    const cleanup = () => {
      cancelled = true;
      gsap.killTweensOf(targets);
    };

    if (prefersReducedMotion) {
      if (isOpen) hasOpenedRef.current = true;

      gsap.set(overlay, {
        visibility: isOpen ? "visible" : "hidden",
        pointerEvents: isOpen ? "auto" : "none",
      });
      gsap.set(panels, {
        yPercent: (index) => (isOpen ? 0 : index === 0 ? -100 : 100),
      });
      gsap.set(links, {
        yPercent: isOpen ? 0 : 110,
        opacity: isOpen ? 1 : 0,
      });

      if (!isOpen) toggleRef.current?.focus({ preventScroll: true });

      return cleanup;
    }

    gsap.killTweensOf(targets);

    if (isOpen) {
      hasOpenedRef.current = true;

      // Claim the hit area before the panels move.
      gsap.set(overlay, { visibility: "visible", pointerEvents: "auto" });

      const timeline = gsap.timeline({
        onComplete: () => {
          // Only focus once the links are fully visible; focusing earlier
          // would silently no-op on hidden elements.
          if (cancelled) return;
          links[0]?.focus({ preventScroll: true });
        },
      });

      timeline
        // Both halves travel at once and butt together at the centre line.
        .to(panels, { yPercent: 0, duration: 0.6, ease: "power4.inOut" })
        // Links follow the panels, overlapping the last of the travel so the
        // reveal reads as one continuous move.
        .to(
          links,
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.45,
            stagger: 0.08,
            ease: "power4.out",
          },
          "-=0.2",
        );

      return cleanup;
    }

    // Closing: the links clear out first, then the panels slide apart.
    const timeline = gsap.timeline({
      onComplete: () => {
        if (cancelled) return;
        gsap.set(overlay, { visibility: "hidden", pointerEvents: "none" });
        toggleRef.current?.focus({ preventScroll: true });
      },
    });

    timeline
      .to(links, { yPercent: 110, opacity: 0, duration: 0.2 })
      .to(panels, {
        yPercent: (index) => (index === 0 ? -100 : 100),
        duration: 0.45,
        ease: "power4.inOut",
      });

    return cleanup;
  }, [isOpen]);

  // Escape closes the menu; while it is open the page behind is scroll-locked,
  // and a resize past the mobile breakpoint dismisses it too.
  useEffect(() => {
    if (!isOpen) return;

    const root = document.documentElement;
    const previousOverflow = root.style.overflow;

    root.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    // The overlay is `md:hidden`; growing past that breakpoint would otherwise
    // leave the page scroll-locked behind an invisible menu.
    const desktop = window.matchMedia("(min-width: 768px)");
    const onBreakpointChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpointChange);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpointChange);
      root.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 bg-transparent">
        <nav
          aria-label="Primary"
          className="relative flex items-center justify-between px-6 py-6 md:px-10"
        >
          <Link
            href="/"
            aria-label="Bintang Murtifandy — home"
            className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full grayscale transition hover:grayscale-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fg)]"
          >
            <Image
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              priority
              className="h-full w-full object-cover"
            />
          </Link>

          <ul className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = isActiveHref(link.href, pathname);

              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`text-sm font-medium transition hover:text-[var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--fg)] ${
                      isActive ? "text-[var(--fg)]" : "text-[var(--fg-muted)]"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <button
            ref={toggleRef}
            type="button"
            aria-expanded={isOpen}
            aria-controls="mobile-nav"
            aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setIsOpen((value) => !value)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border text-[var(--fg-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--fg)] md:hidden ${
              isOpen ? "border-[var(--border-strong)]" : "border-[var(--border)]"
            }`}
          >
            <span aria-hidden="true" className="relative block h-2.5 w-4">
              <span
                className={`absolute left-0 top-0 h-px w-full bg-current transition-transform duration-300 ${
                  isOpen ? "translate-y-[5px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute bottom-0 left-0 h-px w-full bg-current transition-transform duration-300 ${
                  isOpen ? "-translate-y-[5px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </nav>
      </header>

      {/* Full-screen mobile curtain, deliberately a sibling of `<header>` so
          the bar (`z-50`) always stays above it (`z-40`). It stays in the tree
          so the panels can be animated out; `inert` removes it from focus and
          the a11y tree while closed, and the inline styles mirror the GSAP
          baseline so the first paint never flashes an open menu. */}
      <div
        ref={overlayRef}
        id="mobile-nav"
        inert={!isOpen}
        className="fixed inset-0 z-40 overflow-hidden md:hidden"
        style={{ visibility: "hidden", pointerEvents: "none" }}
      >
        <div
          data-menu-panel
          className="absolute inset-x-0 top-0 h-1/2 bg-[var(--bg)] will-change-transform"
        />
        <div
          data-menu-panel
          className="absolute inset-x-0 bottom-0 h-1/2 bg-[var(--bg)] will-change-transform"
        />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6">
          <nav aria-label="Mobile">
            <ul className="flex flex-col items-center gap-2 text-center">
              {MOBILE_LINKS.map((link) => {
                const isActive = isActiveHref(link.href, pathname);

                return (
                  <li key={link.href}>
                    {/* Each label gets its own tight mask so the slide-up is a
                        true reveal, with no sliver of the next line showing.
                        The vertical padding lives on the link itself, inside
                        the clipped box, so descenders stay whole while the
                        110% start offset still clears the mask completely. */}
                    <span className="block overflow-hidden">
                      <Link
                        data-menu-link
                        href={link.href}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => setIsOpen(false)}
                        className={`block will-change-transform rounded-sm py-1 font-sans font-semibold leading-[1.05] tracking-[-0.03em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--fg)] ${
                          isActive ? "text-[var(--fg)]" : "text-[var(--fg-muted)]"
                        }`}
                        style={{
                          fontSize: "clamp(2.75rem, 13vw, 4rem)",
                        }}
                      >
                        {link.label}
                      </Link>
                    </span>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
}

export default Navbar;
