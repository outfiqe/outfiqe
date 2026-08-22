import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type {
  CreatorLeaderboardCategoryParam,
  ListCreatorLeaderboardQuery,
  UpdateCreatorLeaderboardCategoryBody,
} from "./creatorLeaderboard.schemas.js";
import { creatorLeaderboardService } from "./creatorLeaderboard.service.js";

export const creatorLeaderboardController = {
  async listCreators(_req: Request, res: Response) {
    const { category } = validated.query<ListCreatorLeaderboardQuery>(res);

    const snapshot = await creatorLeaderboardService.getTop(category);
    sendSuccess(res, snapshot, "Creator leaderboard.");
  },

  async listCategories(_req: Request, res: Response) {
    const categories = await creatorLeaderboardService.listCategoryStates();
    sendSuccess(res, categories, "Creator leaderboard categories.");
  },

  async updateCategory(_req: Request, res: Response) {
    const { category } = validated.params<CreatorLeaderboardCategoryParam>(res);
    const { enabled } = validated.body<UpdateCreatorLeaderboardCategoryBody>(res);

    const state = await creatorLeaderboardService.setCategoryEnabled(category, enabled);
    sendSuccess(res, state, "Creator leaderboard category updated.");
  },
};
