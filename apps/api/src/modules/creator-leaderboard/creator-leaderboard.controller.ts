import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type {
  CreatorLeaderboardCategoryParam,
  ListCreatorLeaderboardQuery,
  UpdateCreatorLeaderboardCategoryBody,
} from "./creator-leaderboard.schemas.js";
import { creatorLeaderboardService } from "./creator-leaderboard.service.js";

export const creatorLeaderboardController = {
  async listCreators(_req: Request, res: Response) {
    const { category } = validated.query<ListCreatorLeaderboardQuery>(res);

    const snapshot = await creatorLeaderboardService.getTop(category);
    sendSuccess(res, snapshot, "Muse leaderboard.");
  },

  async listCategories(_req: Request, res: Response) {
    const categories = await creatorLeaderboardService.listCategoryStates();
    sendSuccess(res, categories, "Muse leaderboard categories.");
  },

  async updateCategory(_req: Request, res: Response) {
    const { category } = validated.params<CreatorLeaderboardCategoryParam>(res);
    const { enabled } = validated.body<UpdateCreatorLeaderboardCategoryBody>(res);

    const state = await creatorLeaderboardService.setCategoryEnabled(category, enabled);
    sendSuccess(res, state, "Muse leaderboard category updated.");
  },
};
