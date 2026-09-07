import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";
import { SERVER_CACHE_TAGS, SHARED_CONTENT_REVALIDATE_SECONDS } from "@/shared/lib/serverCacheTags";

import {
  type CollectionPage,
  collectionPageSchema,
  type PublicCollection,
} from "./collectionSchemas";

const HOMEPAGE_LIMIT = 6;

export const getHomepageCollectionsServer = async (): Promise<PublicCollection[]> => {
  try {
    const raw = await serverApiRequest<CollectionPage>(`/collections?limit=${HOMEPAGE_LIMIT}`, {
      revalidateSeconds: SHARED_CONTENT_REVALIDATE_SECONDS,
      cacheTags: [SERVER_CACHE_TAGS.collections],
    });
    return collectionPageSchema.parse(raw).collections;
  } catch {
    return [];
  }
};
