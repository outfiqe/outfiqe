import { apiClient } from "@/shared/lib/apiClient";

import {
  type BrandReturn,
  type BrandReturnPage,
  brandReturnPageSchema,
  brandReturnSchema,
} from "./brandReturnSchemas";

const BRAND_RETURNS_PATH = "/logistics/brand/returns";

export const brandReturnApi = {
  async list(cursor?: string): Promise<BrandReturnPage> {
    const res = await apiClient.get(BRAND_RETURNS_PATH, { params: { cursor } });
    return brandReturnPageSchema.parse(res.data);
  },

  async confirm(brandReturnId: string): Promise<BrandReturn> {
    const res = await apiClient.post(`${BRAND_RETURNS_PATH}/${brandReturnId}/confirm`);
    return brandReturnSchema.parse(res.data);
  },
};
