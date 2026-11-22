import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Single registration point for GSAP plugins.
 *
 * `ScrollTrigger` touches `window`/`document` at registration time, so it is
 * only registered in the browser. The module itself stays import-safe on the
 * server, where the exported `gsap` instance is used only for typing.
 *
 * Import `gsap` from here — never from the package root — so the plugin is
 * registered exactly once regardless of how many components animate.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

export default gsap;
