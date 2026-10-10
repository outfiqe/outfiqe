import { z } from "zod";

import { responsiveImageSchema } from "@/shared/lib/responsiveImage";

export const publicHeroSlideSchema = z.object({
  id: z.string(),
  tag: z.string(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().nullable(),
  image: responsiveImageSchema.nullish(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
});
export type PublicHeroSlide = z.infer<typeof publicHeroSlideSchema>;

export const heroSlideListSchema = z.array(publicHeroSlideSchema);
