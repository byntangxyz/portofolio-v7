'use client';

import { useGSAP } from '@gsap/react';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';

import { gsap } from '@/lib/gsap';

/**
 * Fixed architectural background for the public routes.
 *
 * Three hairline layers on the pure OLED canvas:
 * 1. Structural grid — five vertical and five horizontal 1px lines that draw
 *    themselves open (`scaleX`/`scaleY: 0 -> 1`) and drift against the scroll.
 * 2. Data pulses — short solid white segments gliding along the grid lines.
 * 3. Crosshairs — tiny `+` markers at intersections that breathe and rotate.
 *
 * All animation is `x`/`y`/`scale`/`opacity`/`rotate` in a single
 * `gsap.context()`, so nothing but the compositor ever runs. Reduced-motion
 * users get the static grid only: the effect returns before any tween or
 * listener is created.
 */

/** Half-width of the pointer parallax, in px. */
const PARALLAX_MAX = 14;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const FINE_POINTER_QUERY = '(pointer: fine)';

/**
 * Grid geometry as percentages, so the lines stay evenly spaced at any
 * viewport size. `0 20 40 60 80` leaves the right/bottom edge open, which
 * reads as a deliberate margin rather than a picture frame.
 */
const GRID_POSITIONS = [0, 20, 40, 60, 80] as const;

/**
 * Kinetic pulses. `track` is the grid line each one rides (a `left` for the
 * vertical strips, a `top` for the horizontal ones). Every strip is anchored
 * at the start of the viewport (`top-0` / `left-0`) and animated the full
 * viewport distance in `y`/`x` px, so it crosses the screen rather than
 * shifting by its own length. `duration` is the full traversal and the
 * negative `delay` desynchronises the cycles.
 */
const VERTICAL_PULSES = [
  { track: GRID_POSITIONS[1], duration: 9, delay: 0 },
  { track: GRID_POSITIONS[3], duration: 12, delay: -4.5 },
  { track: GRID_POSITIONS[4], duration: 7, delay: -2 },
] as const;

const HORIZONTAL_PULSES = [
  { track: GRID_POSITIONS[2], duration: 11, delay: -6 },
  { track: GRID_POSITIONS[1], duration: 6, delay: -1.5 },
] as const;

/** Crosshair centres, all of which land on a grid intersection. */
const CROSSHAIRS = [
  { left: 20, top: 20 },
  { left: 40, top: 40 },
  { left: 60, top: 20 },
  { left: 20, top: 60 },
  { left: 60, top: 60 },
  { left: 80, top: 40 },
] as const;

export function KineticBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useGSAP(
    () => {
      // Reduced motion: the grid is already painted by CSS, so there is
      // nothing to animate and no listener to attach.
      if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

      const container = containerRef.current;
      if (!container) return;

      const drift = gsap.utils.toArray<HTMLElement>('[data-kb-drift]');
      const verticalLines = gsap.utils.toArray<HTMLElement>(
        '[data-kb-line-v]'
      );
      const horizontalLines = gsap.utils.toArray<HTMLElement>(
        '[data-kb-line-h]'
      );
      const crosshairs = gsap.utils.toArray<HTMLElement>('[data-kb-cross]');

      // Draw the frame open. Exiting a client-side navigation replays it,
      // which doubles as the transition cue between `/` and `/about`.
      const intro = gsap.timeline({
        defaults: { ease: 'power3.out', duration: 1.1 },
      });

      intro
        .from(
          verticalLines,
          { scaleY: 0, transformOrigin: 'top center', stagger: 0.06 },
          0
        )
        .from(
          horizontalLines,
          { scaleX: 0, transformOrigin: 'left center', stagger: 0.06 },
          0.08
        )
        .from(
          crosshairs,
          { opacity: 0, scale: 0.4, stagger: 0.05, duration: 0.7 },
          0.45
        );

      // Layer 1 depth: scrubbed drift over the whole document.
      drift.forEach((layer, index) => {
        gsap.fromTo(
          layer,
          { yPercent: index === 0 ? -6 : -2.5 },
          {
            yPercent: index === 0 ? 6 : 2.5,
            ease: 'none',
            scrollTrigger: {
              start: 0,
              end: 'max',
              scrub: 1,
            },
          }
        );
      });

      // Layer 2: pulses glide the whole viewport. Each strip is anchored at
      // the viewport edge (`top-0`/`left-0`), so a px translate really does
      // cross the screen — `yPercent`/`xPercent` would only move it by its
      // own 64px length. Only `transform` runs, never layout.
      VERTICAL_PULSES.forEach(({ duration, delay }, index) => {
        gsap.fromTo(
          `[data-kb-pulse-v="${index}"]`,
          { y: -80 },
          {
            y: '110vh',
            duration,
            delay,
            ease: 'none',
            repeat: -1,
          }
        );
      });

      HORIZONTAL_PULSES.forEach(({ duration, delay }, index) => {
        gsap.fromTo(
          `[data-kb-pulse-h="${index}"]`,
          { x: -80 },
          {
            x: '110vw',
            duration,
            delay,
            ease: 'none',
            repeat: -1,
          }
        );
      });

      // Layer 3: each crosshair breathes on its own offset timeline. The
      // rotation advances 45deg + 45deg across the loop, so one breath cycle
      // turns the marker 90deg — a `+` renders identically every quarter turn,
      // which makes the `repeat: -1` restart invisible.
      crosshairs.forEach((cross, index) => {
        const tl = gsap.timeline({
          repeat: -1,
          delay: index * 0.7,
        });

        tl.to(cross, {
          opacity: 0.5,
          rotate: 45,
          duration: 4.5,
          ease: 'sine.inOut',
        })
          .to(cross, {
            opacity: 0.15,
            duration: 4.5,
            ease: 'sine.inOut',
          })
          .to(cross, {
            opacity: 0.5,
            rotate: 90,
            duration: 4.5,
            ease: 'sine.inOut',
          })
          .to(cross, {
            opacity: 0.15,
            duration: 4.5,
            ease: 'sine.inOut',
          });
      });

      // Desktop pointer parallax. `quickTo` writes directly to the compositor;
      // the handler is attached once and never measures anything.
      const finePointer = window.matchMedia(FINE_POINTER_QUERY);
      if (!finePointer.matches) return;

      const shiftX = gsap.quickTo('[data-kb-parallax]', 'x', {
        duration: 0.9,
        ease: 'power3.out',
      });
      const shiftY = gsap.quickTo('[data-kb-parallax]', 'y', {
        duration: 0.9,
        ease: 'power3.out',
      });

      const onPointerMove = (event: PointerEvent) => {
        const offsetX = event.clientX / window.innerWidth - 0.5;
        const offsetY = event.clientY / window.innerHeight - 0.5;

        shiftX(offsetX * PARALLAX_MAX * 2);
        shiftY(offsetY * PARALLAX_MAX * 2);
      };

      const onPointerLeave = () => {
        shiftX(0);
        shiftY(0);
      };

      window.addEventListener('pointermove', onPointerMove, {
        passive: true,
      });
      document.addEventListener('pointerleave', onPointerLeave);

      return () => {
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerleave', onPointerLeave);
      };
    },
    { scope: containerRef, dependencies: [pathname] }
  );

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 select-none overflow-hidden"
    >
      <div data-kb-parallax className="absolute inset-0 will-change-transform">
        {/* Layer 1a — structural columns. Over-height so the scrubbed drift
            never exposes an end. */}
        <div data-kb-drift className="absolute inset-0 will-change-transform">
          {GRID_POSITIONS.map((position) => (
            <span
              key={`v-${position}`}
              data-kb-line-v
              className="absolute top-0 h-full w-px bg-white/[0.08]"
              style={{ left: `${position}%` }}
            />
          ))}

          {GRID_POSITIONS.map((position) => (
            <span
              key={`h-${position}`}
              data-kb-line-h
              className="absolute left-0 h-px w-full bg-white/[0.08]"
              style={{ top: `${position}%` }}
            />
          ))}
        </div>

        {/* Layer 1b — a quieter counter-drift for depth. */}
        <div
          data-kb-drift
          className="absolute inset-0 will-change-transform"
        >
          <span
            className="absolute top-0 h-full w-px bg-white/[0.04]"
            style={{ left: '10%' }}
          />
          <span
            className="absolute top-0 h-full w-px bg-white/[0.04]"
            style={{ left: '90%' }}
          />
          <span
            className="absolute left-0 h-px w-full bg-white/[0.04]"
            style={{ top: '10%' }}
          />
          <span
            className="absolute left-0 h-px w-full bg-white/[0.04]"
            style={{ top: '90%' }}
          />
        </div>

        {/* Layer 2 — kinetic data pulses riding the vertical tracks. Each strip
            is anchored at `top-0` so the `y` tween crosses the whole viewport;
            the half-pixel offset centres the 1px segment on its hairline —
            done with `left`, not a transform, since GSAP owns `transform`. */}
        {VERTICAL_PULSES.map((pulse, index) => (
          <span
            key={`pulse-v-${index}`}
            data-kb-pulse-v={index}
            className="absolute top-0 h-16 w-px bg-white/45 will-change-transform"
            style={{ left: `calc(${pulse.track}% - 0.5px)` }}
          />
        ))}

        {/* Layer 2 — kinetic data pulses riding the horizontal tracks, anchored
            at `left-0` for the same full-width travel. */}
        {HORIZONTAL_PULSES.map((pulse, index) => (
          <span
            key={`pulse-h-${index}`}
            data-kb-pulse-h={index}
            className="absolute left-0 h-px w-16 bg-white/45 will-change-transform"
            style={{ top: `calc(${pulse.track}% - 0.5px)` }}
          />
        ))}

        {/* Layer 3 — intersection crosshairs. */}
        {CROSSHAIRS.map((cross) => (
          <span
            key={`cross-${cross.left}-${cross.top}`}
            data-kb-cross
            className="absolute -ml-2 -mt-2 flex h-4 w-4 items-center justify-center font-mono text-xs leading-none text-white/30 will-change-transform"
            style={{ left: `${cross.left}%`, top: `${cross.top}%` }}
          >
            +
          </span>
        ))}
      </div>
    </div>
  );
}

export default KineticBackground;
