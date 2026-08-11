import { z } from "zod";

import { apiClient } from "@/lib/apiClient";
import {
  collectionSchema,
  productSearchResultSchema,
  type Collection,
  type CollectionStatusValue,
  type ProductSearchResult,
} from "./schemas";

const listSchema = z.array(collectionSchema);
const productSearchSchema = z.object({ products: z.array(productSearchResultSchema) });
type ProductSearchResponse = z.infer<typeof productSearchSchema>;

export type CreateCollectionInput = {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
};

export const collectionsApi = {
  async list(): Promise<Collection[]> {
    const res = await apiClient.get<Collection[]>("/collections/admin");
    return listSchema.parse(res.data);
  },

  async create(input: CreateCollectionInput): Promise<Collection> {
    const res = await apiClient.post<Collection>("/collections", input);
    return collectionSchema.parse(res.data);
  },

  async setStatus(id: string, status: CollectionStatusValue): Promise<Collection> {
    const res = await apiClient.patch<Collection>(`/collections/${id}`, { status });
    return collectionSchema.parse(res.data);
  },

  async setImage(id: string, imageUrl: string): Promise<Collection> {
    const res = await apiClient.patch<Collection>(`/collections/${id}`, { imageUrl });
    return collectionSchema.parse(res.data);
  },

  async listProducts(id: string): Promise<ProductSearchResult[]> {
    const res = await apiClient.get<ProductSearchResult[]>(`/collections/admin/${id}/products`);
    return z.array(productSearchResultSchema).parse(res.data);
  },

  async searchProducts(query: string): Promise<ProductSearchResult[]> {
    if (!query.trim()) return [];
    const res = await apiClient.get<ProductSearchResponse>(
      `/products?q=${encodeURIComponent(query)}`,
    );
    return productSearchSchema.parse(res.data).products;
  },

  async setProducts(id: string, productIds: string[]): Promise<void> {
    await apiClient.patch(`/collections/${id}/products`, { productIds });
  },
};
