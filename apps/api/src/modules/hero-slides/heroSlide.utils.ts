import type { HeroSlideRecord, PublicHeroSlide } from "./heroSlide.types.js";

export const toPublicHeroSlide = (slide: HeroSlideRecord): PublicHeroSlide => ({
  id: slide.id,
  tag: slide.tag,
  title: slide.title,
  description: slide.description,
  imageUrl: slide.imageUrl,
  ctaLabel: slide.ctaLabel,
  ctaHref: slide.ctaHref,
});
