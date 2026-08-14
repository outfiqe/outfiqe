import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { heroSlideListSchema, type PublicHeroSlide } from "./heroSlideSchemas";

export const getHeroSlidesServer = async (): Promise<PublicHeroSlide[]> => {
  try {
    const raw = await serverApiRequest<PublicHeroSlide[]>("/hero-slides");
    return heroSlideListSchema.parse(raw);
  } catch {
    return [];
  }
};
