'use client';

import { useGSAP } from '@gsap/react';
import { useRef } from 'react';

import { gsap } from '@/lib/gsap';

const GITHUB_URL = 'https://github.com/byntangxyz';

const LINK_CLASS =
  'text-sm font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]';

/**
 * Minimal footer for `#contact`, shared by `/` and `/about`.
 *
 * Only verified destinations are rendered as links. LinkedIn and a contact
 * email are not published yet, so they are shown as explicit placeholders
 * rather than invented addresses.
 *
 * The top hairline draws itself in from the left, then the eyebrow, headline,
 * and link row stagger up. All motion is `scaleX`/`y`/`opacity`, scoped here,
 * and gated on `prefers-reduced-motion: no-preference`.
 */
export function Contact() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-contact-divider]', {
          scaleX: 0,
          transformOrigin: 'left center',
          duration: 1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 92%',
            once: true,
          },
        });

        gsap.from('[data-contact-reveal]', {
          y: 28,
          opacity: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 88%',
            once: true,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef}>
      <div
        data-contact-divider
        aria-hidden="true"
        className="h-px w-full origin-left bg-[var(--border)]"
      />

      <div className="pt-12 pb-4 md:pt-16">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div data-contact-reveal>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
              Get in touch
            </p>
            <p className="mt-3 font-serif text-xl leading-snug text-[var(--fg)]">
              Reach out on GitHub.
            </p>
          </div>

          <ul data-contact-reveal className="flex flex-wrap items-center gap-8">
            <li>
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={LINK_CLASS}
              >
                GitHub
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a
                href="mailto:bintangmurtifandy@gmail.com"
                className={LINK_CLASS}
              >
                Email <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a
                href="https://www.linkedin.com/in/bintangmurtifandy/"
                target="_blank"
                rel="noopener noreferrer"
                className={LINK_CLASS}
              >
                LinkedIn
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
            <li>
              <a
                href="https://threads.com/@byntangxyz"
                target="_blank"
                rel="noopener noreferrer"
                className={LINK_CLASS}
              >
                Threads
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          </ul>
        </div>

        <p
          data-contact-reveal
          className="mt-12 text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]"
        >
          © 2026 Bintang Murtifandy
        </p>
      </div>
    </div>
  );
}

export default Contact;
