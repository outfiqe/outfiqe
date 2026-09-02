import { z } from "zod";

import { apiClient } from "@/shared/lib/apiClient";

const tastePreferenceSchema = z.object({
  categorySlugs: z.array(z.string()).nullable(),
});

export const tastePreferencesApi = {
  async get(): Promise<string[] | null> {
    const res = await apiClient.get<z.infer<typeof tastePreferenceSchema>>("/taste-preferences/me");
    return tastePreferenceSchema.parse(res.data).categorySlugs;
  },

  async set(categorySlugs: string[]): Promise<void> {
    await apiClient.put("/taste-preferences/me", { categorySlugs });
  },

  async clear(): Promise<void> {
    await apiClient.del("/taste-preferences/me");
  },
};
