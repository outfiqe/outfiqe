import type { HeroSlideStatus } from "@outfiqe/types";
import { z } from "zod";

const statusValues = ["DRAFT", "PUBLISHED"] satisfies HeroSlideStatus[];
export const heroSlideStatusSchema = z.enum(statusValues);
export type HeroSlideStatusValue = z.infer<typeof heroSlideStatusSchema>;

export const heroSlideSchema = z.object({
  id: z.string(),
  tag: z.string(),
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().nullable(),
  ctaLabel: z.string(),
  ctaHref: z.string(),
  status: heroSlideStatusSchema,
  sortOrder: z.number(),
});
export type HeroSlide = z.infer<typeof heroSlideSchema>;
