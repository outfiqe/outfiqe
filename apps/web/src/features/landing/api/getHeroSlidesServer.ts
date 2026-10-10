import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";
import { SERVER_CACHE_TAGS, SHARED_CONTENT_REVALIDATE_SECONDS } from "@/shared/lib/serverCacheTags";

import { heroSlideListSchema, type PublicHeroSlide } from "./heroSlideSchemas";

export const getHeroSlidesServer = async (): Promise<PublicHeroSlide[]> => {
  try {
    const raw = await serverApiRequest<PublicHeroSlide[]>("/hero-slides", {
      revalidateSeconds: SHARED_CONTENT_REVALIDATE_SECONDS,
      cacheTags: [SERVER_CACHE_TAGS.heroSlides],
    });
    return heroSlideListSchema.parse(raw);
  } catch {
    return [];
  }
};
