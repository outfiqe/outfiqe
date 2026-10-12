import { createFileRoute } from "@tanstack/react-router";

import { HeroSlidesPage } from "@/features/hero-slides/components/HeroSlidesPage";

export const Route = createFileRoute("/_authenticated/hero-slides")({
  component: HeroSlidesPage,
});
