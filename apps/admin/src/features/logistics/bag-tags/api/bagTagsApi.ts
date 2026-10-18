import { apiClient } from "@/lib/apiClient";

import {
  type BagTagBatchesPage,
  bagTagBatchesPageSchema,
  type BagTagBatchSheet,
  bagTagBatchSheetSchema,
} from "./bagTagsSchemas";

const BAG_TAG_BATCHES_PATH = "/logistics/admin/bag-tag-batches";

export const bagTagsApi = {
  async list(hubId: string, cursor?: string): Promise<BagTagBatchesPage> {
    const res = await apiClient.get(BAG_TAG_BATCHES_PATH, { params: { hubId, cursor } });
    return bagTagBatchesPageSchema.parse(res.data);
  },

  async create(hubId: string, tagCount: number): Promise<BagTagBatchSheet> {
    const res = await apiClient.post(BAG_TAG_BATCHES_PATH, { hubId, tagCount });
    return bagTagBatchSheetSchema.parse(res.data);
  },

  async getSheet(batchId: string): Promise<BagTagBatchSheet> {
    const res = await apiClient.get(`${BAG_TAG_BATCHES_PATH}/${batchId}`);
    return bagTagBatchSheetSchema.parse(res.data);
  },
};
