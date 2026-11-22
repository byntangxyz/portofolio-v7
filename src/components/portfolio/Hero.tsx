'use client';

import { useEffect, useRef } from 'react';

import { gsap } from '@/lib/gsap';

const HEADING = 'Hello';

type PreloaderWindow = Window & { __preloaderDone?: boolean };

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function Hero() {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      return;
    }

    let played = false;
    let fallbackTimer: number | undefined;

    const ctx = gsap.context(() => {}, containerRef);

    const playEntrance = () => {
      if (played) return;
      played = true;

      if (fallbackTimer !== undefined) {
        window.clearTimeout(fallbackTimer);
      }

      ctx.add(() => {
        const tl = gsap.timeline();

        tl.to('[data-hero-char]', {
          yPercent: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.045,
          ease: 'power4.out',
          overwrite: 'auto',
        }).to(
          '[data-hero-line]',
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            stagger: 0.12,
            ease: 'power3.out',
            overwrite: 'auto',
          },
          '-=0.5'
        );
      });
    };

    ctx.add(() => {
      gsap.set('[data-hero-char]', { yPercent: 110, opacity: 0 });
      gsap.set('[data-hero-line]', { y: 24, opacity: 0 });

      gsap.to('[data-hero-parallax]', {
        y: -48,
        opacity: 0.25,
        ease: 'none',
        scrollTrigger: {
          trigger: container,
          start: 'top top',
          end: 'bottom top',
          scrub: true,
        },
      });
    });

    if ((window as PreloaderWindow).__preloaderDone === true) {
      playEntrance();
    } else {
      window.addEventListener('portfolio:preloader-done', playEntrance, {
        once: true,
      });
      // Safety net so Hero can never stay stuck invisible
      fallbackTimer = window.setTimeout(playEntrance, 2600);
    }

    return () => {
      window.removeEventListener('portfolio:preloader-done', playEntrance);
      if (fallbackTimer !== undefined) {
        window.clearTimeout(fallbackTimer);
      }
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      aria-labelledby="hero-heading"
      className="flex min-h-[72vh] flex-col items-center justify-center px-6 pt-20 text-center"
    >
      <div
        data-hero-parallax
        className="flex flex-col items-center will-change-transform"
      >
        <h1
          id="hero-heading"
          className="font-sans font-bold leading-[0.95] tracking-[-0.045em] text-[var(--fg)]"
          style={{ fontSize: 'clamp(4.5rem, 13vw, 10.5rem)' }}
        >
          <span className="sr-only">{HEADING}</span>
          <span aria-hidden="true" className="inline-flex">
            {HEADING.split('').map((char, index) => (
              <span
                key={`${char}-${index}`}
                className="inline-block overflow-hidden"
              >
                <span
                  data-hero-char
                  className="inline-block will-change-transform"
                >
                  {char}
                </span>
              </span>
            ))}
          </span>
        </h1>

        <p
          data-hero-line
          className="mt-6 text-[var(--fg)]"
          style={{ fontSize: 'clamp(1rem, 1.4vw, 1.25rem)' }}
        >
          Bintang Murtifandy
        </p>

        <p
          data-hero-line
          className="mt-2 max-w-xl leading-relaxed text-[var(--fg-muted)]"
          style={{ fontSize: 'clamp(1rem, 1.4vw, 1.25rem)' }}
        >
          Full-Stack Developer &amp; Network Engineer
          <span aria-hidden="true"> · </span>
          Building web applications and managing infrastructure
        </p>
      </div>
    </section>
  );
}

export default Hero;