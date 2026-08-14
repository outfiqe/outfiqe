import { apiClient } from "@/shared/lib/apiClient";

import type { BrandApplicationInput } from "../schemas/brandApplication.schema";

export const brandApplicationApi = {
  async submit(input: BrandApplicationInput): Promise<void> {
    await apiClient.post("/brand-applications", input);
  },
};
