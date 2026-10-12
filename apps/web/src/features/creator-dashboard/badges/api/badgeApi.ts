import { apiClient } from "@/shared/lib/apiClient";

import { type BadgeCollectionEntry, badgeCollectionSchema } from "./badgeSchemas";

export const badgeApi = {
  async getMyCollection(): Promise<BadgeCollectionEntry[]> {
    const res = await apiClient.get<BadgeCollectionEntry[]>("/badges/collection");
    return badgeCollectionSchema.parse(res.data);
  },

  async updateDisplay(badgeId: string, isDisplayed: boolean): Promise<void> {
    await apiClient.patch(`/badges/${badgeId}/display`, { isDisplayed });
  },

  async updateFeatured(badgeIds: string[]): Promise<void> {
    await apiClient.patch("/badges/featured", { badgeIds });
  },

  async updateTitle(badgeId: string | null): Promise<void> {
    await apiClient.patch("/badges/title", { badgeId });
  },
};
