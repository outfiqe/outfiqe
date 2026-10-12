import { apiClient } from "@/shared/lib/apiClient";

import {
  type SizeStandard,
  type SizeStandardInput,
  sizeStandardListSchema,
  sizeStandardSchema,
} from "./sizeStandardSchemas";

const SIZE_STANDARDS_PATH = "/size-standards";

export const sizeStandardsApi = {
  async list(): Promise<SizeStandard[]> {
    const res = await apiClient.get<SizeStandard[]>(SIZE_STANDARDS_PATH);
    return sizeStandardListSchema.parse(res.data);
  },

  async create(input: SizeStandardInput): Promise<SizeStandard> {
    const res = await apiClient.post<SizeStandard>(SIZE_STANDARDS_PATH, input);
    return sizeStandardSchema.parse(res.data);
  },

  async update(standardId: string, input: SizeStandardInput): Promise<SizeStandard> {
    const res = await apiClient.patch<SizeStandard>(`${SIZE_STANDARDS_PATH}/${standardId}`, input);
    return sizeStandardSchema.parse(res.data);
  },

  async archive(standardId: string): Promise<void> {
    await apiClient.del(`${SIZE_STANDARDS_PATH}/${standardId}`);
  },
};
