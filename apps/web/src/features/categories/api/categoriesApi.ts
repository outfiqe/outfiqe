import { apiClient } from "@/shared/lib/apiClient";
import { categoryListSchema, type PublicCategory } from "./categorySchemas";

export const categoriesApi = {
  async list(): Promise<PublicCategory[]> {
    const res = await apiClient.get<PublicCategory[]>("/categories");
    return categoryListSchema.parse(res.data);
  },
};
