import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type PublicCollection, publicCollectionSchema } from "./collectionSchemas";

export const getCollectionDetailServer = async (slug: string): Promise<PublicCollection | null> => {
  try {
    const raw = await serverApiRequest<PublicCollection>(`/collections/${slug}`);
    return publicCollectionSchema.parse(raw);
  } catch {
    return null;
  }
};
