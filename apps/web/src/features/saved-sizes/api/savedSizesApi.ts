import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";

const savedSizeSchema = z.object({
  productTypeId: z.string(),
  productTypeSlug: z.string(),
  productTypeLabel: z.string(),
  sizeOptions: z.array(z.string()),
  savedSize: z.string().nullable(),
  lastBoughtSize: z.string().nullable(),
});

const savedSizesSchema = z.array(savedSizeSchema);

export type SavedSize = z.infer<typeof savedSizeSchema>;

const MY_SIZES_PATH = "/saved-sizes/me";

export const savedSizesApi = {
  async listMine(): Promise<SavedSize[]> {
    const res = await apiClient.get(MY_SIZES_PATH);
    return savedSizesSchema.parse(res.data);
  },

  async save(productTypeId: string, sizeLabel: string): Promise<SavedSize[]> {
    const res = await apiClient.put(`${MY_SIZES_PATH}/${productTypeId}`, { sizeLabel });
    return savedSizesSchema.parse(res.data);
  },

  async clear(productTypeId: string): Promise<SavedSize[]> {
    const res = await apiClient.del(`${MY_SIZES_PATH}/${productTypeId}`);
    return savedSizesSchema.parse(res.data);
  },
};
