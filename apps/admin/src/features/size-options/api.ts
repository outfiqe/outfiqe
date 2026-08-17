import { z } from "zod";

import { apiClient } from "@/lib/apiClient";

import { type ProductTypeSlug, type SizeOption, sizeOptionSchema } from "./schemas";

const listSchema = z.array(sizeOptionSchema);

export type CreateSizeOptionInput = {
  type: ProductTypeSlug;
  label: string;
  sortOrder?: number;
};

export const sizeOptionsApi = {
  async list(): Promise<SizeOption[]> {
    const res = await apiClient.get<SizeOption[]>("/size-options/admin");
    return listSchema.parse(res.data);
  },

  async create(input: CreateSizeOptionInput): Promise<SizeOption> {
    const res = await apiClient.post<SizeOption>("/size-options", input);
    return sizeOptionSchema.parse(res.data);
  },

  async remove(id: string): Promise<void> {
    await apiClient.del(`/size-options/${id}`);
  },
};
