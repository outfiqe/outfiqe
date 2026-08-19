import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type { ListLeaderboardQuery } from "./leaderboard.schemas.js";
import { leaderboardService } from "./leaderboard.service.js";

export const leaderboardController = {
  async listBrands(_req: Request, res: Response) {
    const { category } = validated.query<ListLeaderboardQuery>(res);

    const snapshot = await leaderboardService.getTop(category);
    sendSuccess(res, snapshot, "Brand leaderboard.");
  },
};
