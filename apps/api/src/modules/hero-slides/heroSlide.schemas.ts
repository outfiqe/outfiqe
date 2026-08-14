import type { HeroSlideStatus } from "@outfiqe/types";
import { z } from "zod";

const TAG_MAX = 60;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 280;
const CTA_LABEL_MAX = 40;

const statusValues = ["DRAFT", "PUBLISHED"] satisfies HeroSlideStatus[];
export const heroSlideStatusSchema = z.enum(statusValues);

export const createHeroSlideSchema = z.object({
  tag: z.string().trim().min(1).max(TAG_MAX),
  title: z.string().trim().min(1).max(TITLE_MAX),
  description: z.string().trim().min(1).max(DESCRIPTION_MAX),
  imageUrl: z.url().optional(),
  ctaLabel: z.string().trim().min(1).max(CTA_LABEL_MAX),
  ctaHref: z.string().trim().min(1),
  status: heroSlideStatusSchema.optional(),
  sortOrder: z.number().int().optional(),
});

export const updateHeroSlideSchema = createHeroSlideSchema.partial();

export const heroSlideIdParamSchema = z.object({ id: z.uuid() });

export type CreateHeroSlideBody = z.infer<typeof createHeroSlideSchema>;
export type UpdateHeroSlideBody = z.infer<typeof updateHeroSlideSchema>;
export type HeroSlideIdParam = z.infer<typeof heroSlideIdParamSchema>;
