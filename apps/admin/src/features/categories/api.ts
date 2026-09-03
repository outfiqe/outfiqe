import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import { type Category, categorySchema, type CategoryStatusValue } from "./schemas";

const listSchema = z.array(categorySchema);

const categoryPopularitySchema = z.array(z.object({ slug: z.string(), userCount: z.number() }));
export type CategoryPopularity = z.infer<typeof categoryPopularitySchema>[number];

export type CreateCategoryInput = {
  name: string;
  slug: string;
  imageUrl?: string;
};

export const categoriesApi = {
  async list(): Promise<Category[]> {
    const res = await apiClient.get<Category[]>("/categories/admin");
    return listSchema.parse(res.data);
  },

  async create(input: CreateCategoryInput): Promise<Category> {
    const res = await apiClient.post<Category>("/categories", input);
    return categorySchema.parse(res.data);
  },

  async setStatus(id: string, status: CategoryStatusValue): Promise<Category> {
    const res = await apiClient.patch<Category>(`/categories/${id}`, { status });
    return categorySchema.parse(res.data);
  },

  async setImage(id: string, imageUrl: string): Promise<Category> {
    const res = await apiClient.patch<Category>(`/categories/${id}`, { imageUrl });
    return categorySchema.parse(res.data);
  },

  async reorder(orderedIds: string[]): Promise<void> {
    await apiClient.post("/categories/reorder", { orderedIds });
  },

  async popularity(): Promise<CategoryPopularity[]> {
    const res = await apiClient.get<CategoryPopularity[]>("/taste-preferences/popularity");
    return categoryPopularitySchema.parse(res.data);
  },
};
