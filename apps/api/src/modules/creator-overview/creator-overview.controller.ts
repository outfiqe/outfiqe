import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";

import { creatorOverviewService } from "./creator-overview.service.js";

export const creatorOverviewController = {
  async getMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const overview = await creatorOverviewService.getOverview(userId);
    sendSuccess(res, overview, "Your creator overview.");
  },
};
