import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";
import { brandProductSchema, type BrandProduct } from "./brandProductsSchemas";
import type { ProductFormInput } from "../schemas/productForm.schema";

const listSchema = z.array(brandProductSchema);

export const brandProductsApi = {
  async list(): Promise<BrandProduct[]> {
    const res = await apiClient.get<unknown>("/products/mine");
    return listSchema.parse(res.data);
  },

  async create(input: ProductFormInput): Promise<BrandProduct> {
    const res = await apiClient.post<unknown>("/products", {
      ...input,
      imageUrl: input.imageUrl || undefined,
    });
    return brandProductSchema.parse(res.data);
  },
};
