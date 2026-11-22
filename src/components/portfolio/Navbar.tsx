"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV_LINKS = [
  // `Projects` is an anchor on the home page, so link to the full path.
  { label: "Projects", href: "/#work" },
  { label: "About", href: "/about" },
  // `#contact` lives in the shared public layout, so it works from both pages.
  { label: "Contact", href: "#contact" },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu when the route changes. Adjusting state during
  // render (rather than in an effect) avoids a cascading re-render, and the
  // mobile links also close the menu on click for immediate feedback.
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setOpen(false);
  }

  // Close the mobile menu on Escape so keyboard users are never trapped.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-transparent">
      <nav
        aria-label="Primary"
        className="flex items-center justify-between px-6 py-6 md:px-10"
      >
        <Link
          href="/"
          aria-label="Bintang Murtifandy — home"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs font-semibold tracking-[0.02em] text-[var(--fg-muted)] grayscale transition hover:text-[var(--fg)] hover:grayscale-0"
        >
          BM
        </Link>

        <ul className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/about" && pathname === "/about";

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`text-sm font-medium transition hover:text-[var(--fg)] ${
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
          type="button"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setOpen((value) => !value)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-[var(--fg-muted)] transition hover:border-[var(--border-strong)] hover:text-[var(--fg)] md:hidden"
        >
          <span aria-hidden="true" className="relative block h-2.5 w-4">
            <span
              className={`absolute left-0 top-0 h-px w-full bg-current transition-transform duration-300 ${
                open ? "translate-y-[5px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute bottom-0 left-0 h-px w-full bg-current transition-transform duration-300 ${
                open ? "-translate-y-[5px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </nav>

      <div
        id="mobile-nav"
        hidden={!open}
        className="border-b border-[var(--border)] bg-[var(--bg)] px-6 pb-6 md:hidden"
      >
        <ul className="flex flex-col gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = link.href === "/about" && pathname === "/about";

            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`block py-3 text-base font-medium transition hover:text-[var(--fg)] ${
                    isActive ? "text-[var(--fg)]" : "text-[var(--fg-muted)]"
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </header>
  );
}

export default Navbar;
