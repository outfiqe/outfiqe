import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import {
  type CollectionPage,
  collectionPageSchema,
  type PublicCollection,
} from "./collectionSchemas";

const HOMEPAGE_LIMIT = 6;

export const getHomepageCollectionsServer = async (): Promise<PublicCollection[]> => {
  try {
    const raw = await serverApiRequest<CollectionPage>(`/collections?limit=${HOMEPAGE_LIMIT}`);
    return collectionPageSchema.parse(raw).collections;
  } catch {
    return [];
  }
};
