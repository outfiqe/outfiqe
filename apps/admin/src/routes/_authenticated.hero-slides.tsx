import { createFileRoute } from "@tanstack/react-router";

import { HeroSlidesPage } from "@/features/hero-slides/HeroSlidesPage";

export const Route = createFileRoute("/_authenticated/hero-slides")({
  component: HeroSlidesPage,
});
