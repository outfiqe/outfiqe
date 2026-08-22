import { apiClient } from "@/shared/lib/apiClient";

import type { CreatorLeaderboardCategory } from "../creatorLeaderboard.constants";
import {
  creatorLeaderboardCategoryListSchema,
  type CreatorLeaderboardCategoryState,
  type CreatorLeaderboardSnapshot,
  creatorLeaderboardSnapshotSchema,
} from "./creatorLeaderboardSchemas";

export const creatorLeaderboardApi = {
  async listCreators(category: CreatorLeaderboardCategory): Promise<CreatorLeaderboardSnapshot> {
    const res = await apiClient.get<CreatorLeaderboardSnapshot>(
      `/creator-leaderboard?category=${category}`,
    );
    return creatorLeaderboardSnapshotSchema.parse(res.data);
  },

  async listCategories(): Promise<CreatorLeaderboardCategoryState[]> {
    const res = await apiClient.get<CreatorLeaderboardCategoryState[]>(
      "/creator-leaderboard/categories",
    );
    return creatorLeaderboardCategoryListSchema.parse(res.data);
  },
};
