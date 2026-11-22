'use client';

import { useGSAP } from '@gsap/react';
import Image from 'next/image';
import { useRef, type ReactNode } from 'react';

import { gsap, ScrollTrigger } from '@/lib/gsap';

/**
 * Verified facts only. Anything not confirmed stays a clearly marked
 * placeholder instead of invented biography, clients, or dates.
 */
const ROLE = 'Full-Stack Developer & Network Engineer';
const FOCUS = 'Building web applications and managing infrastructure';

const GITHUB_URL = 'https://github.com/byntangxyz';

const STACK_GROUPS = [
  {
    label: 'Frontend',
    items: ['Next.js', 'Vue / Nuxt', 'Tailwind CSS'],
  },
  {
    label: 'Backend & Infrastructure',
    items: ['Laravel', 'Go', 'Node.js', 'Docker', 'Proxmox', 'MikroTik'],
  },
] as const;

/**
 * Editorial section, rendered on `/about`.
 *
 * Motion layers, all `y`/`opacity`/`scale` only:
 * - the two serif headings rise out of overflow masks,
 * - the portrait drifts against the scroll (scrubbed),
 * - every `[data-about-reveal]` block batches in as it reaches the viewport.
 *
 * Everything is scoped to this section and gated on
 * `prefers-reduced-motion: no-preference`.
 */
export function AboutAndStack() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        // Masked heading reveal: the wrapper clips, the inner span slides up.
        // Each mask owns its trigger so the lower heading still animates when
        // the reader actually reaches it.
        gsap.utils.toArray<HTMLElement>('[data-about-mask]').forEach((mask) => {
          gsap.from(mask.querySelector('[data-about-mask-inner]'), {
            yPercent: 110,
            duration: 1,
            ease: 'power4.out',
            scrollTrigger: {
              trigger: mask,
              start: 'top 85%',
              once: true,
            },
          });
        });

        // Portrait parallax: scrubbed drift keeps the column from feeling
        // static while the copy beside it reveals on a separate trigger.
        gsap.fromTo(
          '[data-about-portrait]',
          { yPercent: -6 },
          {
            yPercent: 6,
            ease: 'none',
            scrollTrigger: {
              trigger: '[data-about-portrait]',
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.8,
            },
          }
        );

        const blocks = gsap.utils.toArray<HTMLElement>('[data-about-reveal]');

        if (blocks.length === 0) return;

        // Batch per element instead of one trigger on the whole tall section,
        // so blocks reveal as they reach the viewport rather than all at once
        // while the lower half is still off-screen.
        //
        // Hide first, then animate to the natural state: `gsap.from` alone
        // would let each block paint at full opacity for a frame before the
        // trigger fires and snap it back to the start of the reveal.
        gsap.set(blocks, { y: 40, opacity: 0 });

        ScrollTrigger.batch(blocks, {
          start: 'top 85%',
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, {
              y: 0,
              opacity: 1,
              duration: 0.85,
              ease: 'power3.out',
              stagger: 0.1,
              overwrite: true,
            }),
        });
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef}>
      <div className="text-center" data-about-reveal>
        <h2
          className="font-serif font-normal tracking-[-0.02em] text-[var(--fg)]"
          style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.75rem)' }}
        >
          <span
            data-about-mask
            className="inline-block overflow-hidden pb-[0.12em] align-bottom"
          >
            <span
              data-about-mask-inner
              className="inline-block will-change-transform"
            >
              About
            </span>
          </span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-serif text-lg leading-relaxed text-[var(--fg-muted)] md:text-xl">
          {ROLE} — {FOCUS.toLowerCase()}.
        </p>
      </div>

      <div className="mt-16 grid grid-cols-1 items-start gap-12 md:mt-20 md:grid-cols-[auto_1fr] md:gap-16">
        <div className="mx-auto w-56 md:mx-0 md:w-72" data-about-reveal>
          <div
            data-about-portrait
            className="h-56 w-56 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--surface)] grayscale will-change-transform md:h-72 md:w-72"
          >
            <Image
              src="/user-profile.png"
              alt="Bintang Murtifandy"
              width={288}
              height={288}
              sizes="(min-width: 768px) 18rem, 14rem"
              className="h-full w-full object-cover"
            />
          </div>
          <p className="mt-4 text-center text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)] md:text-left">
            Bintang Murtifandy
          </p>
        </div>

        <div className="max-w-xl" data-about-reveal>
          <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
            About
          </p>

          <div className="mt-5 space-y-5 font-serif text-lg leading-relaxed text-[var(--fg)]">
            <p>
              I am Bintang Maulana Murtifandy, a Fullstack Web Developer with a
              strong foundation in Network Infrastructure. Currently completing
              my studies in Informatics and Networking, I enjoy working at the
              intersection of the software people interact with and the
              underlying systems that keep it running.
            </p>
            <p>
              I focus on turning complex problems into practical, dependable
              solutions. Whether collaborating on a team project, managing
              infrastructure, or building independent work, I am always eager to
              create useful technology and keep growing across both software and
              networking.
            </p>
          </div>

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center rounded-lg border border-[var(--border-strong)] px-5 py-2.5 text-sm font-medium text-[var(--fg)] transition-colors hover:bg-white hover:text-black"
          >
            View GitHub
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>

      <div className="mt-24 md:mt-32">
        <h3
          className="text-center font-serif font-normal tracking-[-0.02em] text-[var(--fg)]"
          style={{ fontSize: 'clamp(2.25rem, 4.5vw, 3.75rem)' }}
        >
          <span
            data-about-mask
            className="inline-block overflow-hidden pb-[0.12em] align-bottom"
          >
            <span
              data-about-mask-inner
              className="inline-block will-change-transform"
            >
              Experience &amp; Stack
            </span>
          </span>
        </h3>

        <div className="mt-12 grid grid-cols-1 gap-12 md:grid-cols-3">
          <StackColumn label="Experience">
            <p className="font-serif text-xl leading-snug text-[var(--fg)]">
              Professional history
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--fg-muted)]">
              Freelance Web Developer — 2025–present 
            </p>
          </StackColumn>

          {STACK_GROUPS.map((group) => (
            <StackColumn key={group.label} label={group.label}>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li
                    key={item}
                    className="font-serif text-xl leading-snug text-[var(--fg)]"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </StackColumn>
          ))}
        </div>
      </div>
    </div>
  );
}

function StackColumn({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div data-about-reveal>
      <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted)]">
        {label}
      </p>
      <div className="mt-5">{children}</div>
    </div>
  );
}

export default AboutAndStack;
