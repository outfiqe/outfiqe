import { apiClient } from "@/shared/lib/apiClient";

import type { LeaderboardCategory } from "../constants/leaderboard.constants";
import { type LeaderboardSnapshot, leaderboardSnapshotSchema } from "./leaderboardSchemas";

export const leaderboardApi = {
  async listBrands(category: LeaderboardCategory): Promise<LeaderboardSnapshot> {
    const res = await apiClient.get<LeaderboardSnapshot>(
      `/leaderboard/brands?category=${category}`,
    );
    return leaderboardSnapshotSchema.parse(res.data);
  },
};
