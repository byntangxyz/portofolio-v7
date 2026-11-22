import type { Metadata } from "next";

import { AboutAndStack } from "@/components/portfolio/AboutAndStack";

export const metadata: Metadata = {
  title: "About",
  description:
    "Background, experience, and stack of Bintang Murtifandy — full-stack developer and network engineer.",
};

export default function AboutPage() {
  return (
    // `pt-*` clears the fixed navbar; the section keeps the editorial rhythm.
    <section
      aria-label="About"
      className="mx-auto w-full max-w-[1040px] px-6 pt-28 pb-8 md:px-10 md:pt-36"
    >
      <AboutAndStack />
    </section>
  );
}
