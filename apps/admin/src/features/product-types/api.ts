import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import { type ProductType, productTypeSchema } from "./schemas";

const listSchema = z.array(productTypeSchema);

export type CreateProductTypeInput = {
  label: string;
  slug: string;
};

export const productTypesApi = {
  async list(): Promise<ProductType[]> {
    const res = await apiClient.get<ProductType[]>("/product-types/admin");
    return listSchema.parse(res.data);
  },

  async create(input: CreateProductTypeInput): Promise<ProductType> {
    const res = await apiClient.post<ProductType>("/product-types", input);
    return productTypeSchema.parse(res.data);
  },

  async setActive(id: string, isActive: boolean): Promise<ProductType> {
    const res = await apiClient.patch<ProductType>(`/product-types/${id}`, { isActive });
    return productTypeSchema.parse(res.data);
  },

  async reorder(orderedIds: string[]): Promise<void> {
    await apiClient.post("/product-types/reorder", { orderedIds });
  },
};
