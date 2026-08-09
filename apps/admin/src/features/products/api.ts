import { z } from "zod";

import { apiClient } from "@/lib/apiClient";
import { productSchema, type Product, type ProductStatusValue } from "./schemas";

const listSchema = z.array(productSchema);

export const productsApi = {
  async list(status: ProductStatusValue): Promise<Product[]> {
    const res = await apiClient.get<unknown>(`/products/review?status=${status}`);
    return listSchema.parse(res.data);
  },

  async approve(id: string): Promise<void> {
    await apiClient.post(`/products/${id}/approve`);
  },

  async reject(id: string): Promise<void> {
    await apiClient.post(`/products/${id}/reject`);
  },
};
