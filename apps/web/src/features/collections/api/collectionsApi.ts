import { apiClient } from "@/shared/lib/apiClient";
import {
  collectionPageSchema,
  collectionProductPageSchema,
  publicCollectionSchema,
  type CollectionPage,
  type CollectionProductPage,
  type PublicCollection,
} from "./collectionSchemas";

export const collectionsApi = {
  async list(cursor?: string, limit?: number): Promise<CollectionPage> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (limit) params.set("limit", String(limit));

    const res = await apiClient.get<CollectionPage>(`/collections?${params.toString()}`);
    return collectionPageSchema.parse(res.data);
  },

  async get(slug: string): Promise<PublicCollection> {
    const res = await apiClient.get<PublicCollection>(`/collections/${slug}`);
    return publicCollectionSchema.parse(res.data);
  },

  async listProducts(slug: string, cursor?: string): Promise<CollectionProductPage> {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);

    const res = await apiClient.get<CollectionProductPage>(
      `/collections/${slug}/products?${params.toString()}`,
    );
    return collectionProductPageSchema.parse(res.data);
  },
};
