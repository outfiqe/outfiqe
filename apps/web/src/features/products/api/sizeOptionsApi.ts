import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";

import { type SizeOption, sizeOptionSchema } from "./sizeOptionSchemas";

const listSchema = z.array(sizeOptionSchema);

export const sizeOptionsApi = {
  async listByType(type: string): Promise<SizeOption[]> {
    const res = await apiClient.get<SizeOption[]>(`/size-options?type=${encodeURIComponent(type)}`);
    return listSchema.parse(res.data);
  },
};
