import { toResponsiveImage } from "#lib/responsive-image.utils.js";

import type { HeroSlideWithImageAsset, PublicHeroSlide } from "./heroSlide.types.js";

export const toPublicHeroSlide = (slide: HeroSlideWithImageAsset): PublicHeroSlide => ({
  id: slide.id,
  tag: slide.tag,
  title: slide.title,
  description: slide.description,
  imageUrl: slide.imageUrl,
  image: slide.imageUrl ? toResponsiveImage(slide.imageUrl, slide.imageAsset) : null,
  ctaLabel: slide.ctaLabel,
  ctaHref: slide.ctaHref,
});
