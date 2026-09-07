import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";
import { SERVER_CACHE_TAGS, SHARED_CONTENT_REVALIDATE_SECONDS } from "@/shared/lib/serverCacheTags";

import { categoryListSchema, type PublicCategory } from "./categorySchemas";

export const getCategoriesServer = async (): Promise<PublicCategory[]> => {
  try {
    const raw = await serverApiRequest<PublicCategory[]>("/categories", {
      revalidateSeconds: SHARED_CONTENT_REVALIDATE_SECONDS,
      cacheTags: [SERVER_CACHE_TAGS.categories],
    });
    return categoryListSchema.parse(raw);
  } catch {
    return [];
  }
};
