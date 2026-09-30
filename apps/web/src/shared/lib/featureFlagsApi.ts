import { z } from "zod";

import { apiClient } from "./apiClient";

export type FeatureFlagKey =
  "outfit_builder" | "outfit_photos" | "outfit_try_on" | "outfit_public_feed";

const myFeatureFlagsSchema = z.object({ enabledKeys: z.array(z.string()) });

export const featureFlagsApi = {
  async listMine(): Promise<string[]> {
    const res = await apiClient.get("/feature-flags/mine");
    return myFeatureFlagsSchema.parse(res.data).enabledKeys;
  },
};
