<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

# Portfolio Architecture & Rules
- **Deployment:** Self-hosted Docker (`output: "standalone"`) alongside a custom self-hosted REST CMS on the same homelab network. Never use Vercel-specific packages.
- **Stack:** Next.js (App Router), TypeScript, Tailwind CSS v4, GSAP (`gsap`, `@gsap/react`, `ScrollTrigger`), Lenis.
- **Data Layer:** Fetch project data on the server via `src/lib/cms.ts` (`CMS_INTERNAL_URL`) using types in `src/types/cms.ts`, then pass `Project[]` as props to animated client components.
- **GSAP Rules:**
  - Register `ScrollTrigger` once inside `src/lib/gsap.ts`.
  - Always scope animations inside `useGSAP(() => { ... }, { scope: containerRef })`.
  - Animate GPU-composited properties (`x`, `y`, `scale`, `rotate`, `opacity`) only.
- **Token Discipline:** Never read lockfiles, `.next/`, or `public/`. Only touch files explicitly requested.

Before creating or modifying any UI component, read DESIGN.md and strictly follow its palette, grid rhythm, GSAP rules, and banned list.
<!-- END:nextjs-agent-rules -->
