# DESIGN.md — OLED Editorial Portfolio

## 1. Visual Philosophy & OLED Palette
- **Vibe:** Ultra-clean, Apple/Google-grade minimalist portfolio on pure OLED black. High contrast, generous negative space, zero decorative clutter.
- **Colors (strictly use CSS variables from `globals.css`):**
  - `--bg`: `#000000` (Pure OLED black canvas across all public & admin pages)
  - `--surface`: `#0D0D0D` (Subtle card fallback & admin panels)
  - `--surface-hover`: `#161616`
  - `--fg`: `#FFFFFF` (Primary headlines & active links)
  - `--fg-muted`: `#8E8E93` (Subtitles, dates, secondary metadata)
  - `--border`: `rgba(255, 255, 255, 0.10)` (1px crisp hairlines)
  - `--border-strong`: `rgba(255, 255, 255, 0.22)` (Hover states & minimal outline buttons)
- **No accent color sprawl:** Monochrome palette only. Color comes exclusively from project thumbnails.

## 2. Typography System (`next/font/google`)
- **Primary Sans (`--font-sans`):** `Plus Jakarta Sans` or `Geist` — used for Navbar, Hero `"Hello"`, Project Card titles, and Admin CMS.
- **Editorial Serif (`--font-serif`):** `Newsreader` or `Instrument Serif` — used for `AboutAndStack.tsx` headings, bio copy, and Experience/Stack titles to create quiet elegance.
- **Scale & Tracking:**
  - Hero Display: `clamp(4.5rem, 13vw, 10.5rem)`, `font-bold`, `leading-[0.95]`, `tracking-[-0.045em]`.
  - Hero Subtitle: `clamp(1rem, 1.4vw, 1.25rem)`, `text-[var(--fg-muted)]`, `leading-relaxed`.
  - Project Card Title: `clamp(1.5rem, 2.2vw, 2.125rem)`, `font-semibold`, `leading-[1.1]`, `tracking-[-0.03em]`.
  - Editorial Section Heading (Serif): `clamp(2.25rem, 4.5vw, 3.75rem)`, `font-normal`, `tracking-[-0.02em]`.
  - Micro Eyebrows (`ABOUT`, `GET IN TOUCH`, years): `11px`–`12px`, `uppercase`, `tracking-[0.12em]`, `text-[var(--fg-muted)]`.

## 3. Section Blueprints (Mapped to `ARCHITECTURE.md`)

### Header (`Navbar`)
- Fixed top bar, full width, `px-6 md:px-10 py-6`, transparent background (no blur bar).
- **Left:** `36px x 36px` circular grayscale avatar (`rounded-full grayscale hover:grayscale-0 transition`).
- **Right:** 2–3 plain text links (`Projects`, `About`, `Contact`), `text-sm font-medium`, `gap-8`. No button borders.

### `Hero.tsx`
- Centered vertical composition (`min-h-[72vh] flex flex-col items-center justify-center text-center px-6 pt-20`).
- **Headline:** Massive single-word or short greeting (`Hello`).
- **Subtitle:** 2 crisp lines max below headline (Name + Role, then current focus/stack).
- Leave the bottom ~15–20% of the initial viewport open so the top edge of `SelectedWork.tsx` naturally peeks into view.

### `SelectedWork.tsx` (Asymmetric Showcase Grid)
- Container: `max-w-[1280px] mx-auto px-6 md:px-10 pb-32`.
- **Grid Rhythm (Desktop `md:grid-cols-12 gap-6`):**
  - Alternate row proportions based on index to avoid boring uniform grids:
    - Row 1 (index 0, 1): `md:col-span-5` + `md:col-span-7`
    - Row 2 (index 2, 3): `md:col-span-7` + `md:col-span-5`
    - Repeat pattern (`5/7`, `7/5`).
- **Project Card Anatomy:**
  - `relative overflow-hidden rounded-[22px] bg-[var(--surface)] border border-[var(--border)] h-[380px] md:h-[460px] group`.
  - Full-bleed `thumbnail_url` image (`object-cover w-full h-full`) with subtle bottom gradient scrim (`from-black/75 via-black/20 to-transparent`) so white text always stays legible.
  - **Bottom-left overlay (`p-7 md:p-9`):** Project `title` (max 2 lines). Keep card face clean—reveal `summary`, up to 3 minimal text tags, and `live_url`/`repo_url` links smoothly on hover (or inside a clean detail view/modal). Never clutter cards with colorful pill badges.

### `AboutAndStack.tsx` (Editorial Serif Section)
- Container: `max-w-[1040px] mx-auto px-6 md:px-10 py-28 border-t border-[var(--border)]`.
- **Top Intro:** Centered Serif heading + muted Serif subtitle, followed by a 2-column split:
  - Left: Circular grayscale portrait (`w-56 h-56 md:w-72 md:h-72 rounded-full grayscale object-cover`).
  - Right: `ABOUT` eyebrow, 2 short Serif paragraphs, and a single minimal outline button (`border border-[var(--border-strong)] rounded-lg px-5 py-2.5 text-sm hover:bg-white hover:text-black transition`).
- **Experience & Tech Stack Grid:** Centered Serif heading, followed by a clean 3-column grid (`grid-cols-1 md:grid-cols-3 gap-12`). Each column starts with a muted year/category label (`2025 – Present`, `Frontend`, `Infra & Backend`), followed by Serif titles and muted sans sub-labels. Zero vertical timeline lines or icons.

### `Contact.tsx` (Minimal Footer)
- Container: `max-w-[1280px] mx-auto px-6 md:px-10 py-16 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6`.
- Left-aligned plain text links (`GitHub`, `LinkedIn`, `Email`) with `gap-8 text-sm font-medium text-[var(--fg-muted)] hover:text-white transition`.

### Minimal Admin CMS (`/admin` & `/admin/login`)
- Pure OLED `#000000` background, `#0D0D0D` inputs with `1px solid var(--border)`, `rounded-lg`, monospace labels, crisp white primary save button (`bg-white text-black`). No bloated dashboard sidebars or charts.

## 4. GSAP Motion & Parallax Spec (`useGSAP` + Lenis)
Always wrap animations in `useGSAP(() => { ... }, { scope: containerRef })` and guard with `gsap.matchMedia()` for `(prefers-reduced-motion: no-preference)`.

1. **Hero Typography Reveal (`Hero.tsx`):**
   - Split `"Hello"` into characters (wrapped in `overflow-hidden inline-block` spans).
   - Animate `yPercent: 110 -> 0`, `opacity: 0 -> 1`, `duration: 0.9`, `stagger: 0.04`, `ease: "expo.out"`.
   - Follow with subtitle masked line slide (`y: 18 -> 0`, `opacity: 0 -> 1`, `duration: 0.7`, `ease: "power3.out"`, overlap `-=0.45`).
2. **Project Showcase Parallax (`SelectedWork.tsx`):**
   - **Image Scale Parallax (every card):** Set card `<img>` to `scale: 1.18` inside `overflow-hidden`. Attach a scrubbed `ScrollTrigger` (`start: "top bottom"`, `end: "bottom top"`, `scrub: true`) animating `yPercent: -10 -> 10` with `ease: "none"`.
   - **Subtle Card Entrance:** Fade + lift cards softly (`y: 36 -> 0`, `opacity: 0 -> 1`, `duration: 0.85`, `ease: "power3.out"`, `start: "top 88%"`, `once: true`).
   - **Hover Micro-interaction:** CSS `transition-transform duration-700 ease-out group-hover:scale-[1.03]` on inner image wrapper (separate from GSAP `yPercent` target so transforms never conflict).
3. **Editorial Typography Reveal (`AboutAndStack.tsx`):**
   - Masked line/block reveal (`y: 24 -> 0`, `opacity: 0 -> 1`, `stagger: 0.08`, `duration: 0.8`, `ease: "power3.out"`, `start: "top 85%"`, `once: true`). No bounce, no elastic easing.

## 5. STRICTLY BANNED (Anti-AI-Slop Rules)
- NO purple/blue/cyan gradients, glowing blobs, mesh backgrounds, or ambient spotlights.
- NO glassmorphism (`backdrop-blur`), neon borders, or heavy `box-shadow` glow effects.
- NO floating badge clouds, animated gradient borders, or icon-in-a-circle feature cards.
- NO cliché AI copy ("Crafting digital experiences", "Passionate full-stack ninja", "Let's build something extraordinary").
- NO animating `y` and `scale` on the exact same DOM node with both GSAP and Tailwind hover classes (always separate the parallax wrapper from the hover-scale element).