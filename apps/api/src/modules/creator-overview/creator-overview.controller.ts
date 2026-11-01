import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import type { OverviewPeriodQuery } from "#lib/overview-period.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import { creatorOverviewService } from "./creator-overview.service.js";

export const creatorOverviewController = {
  async getMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { days } = validated.query<OverviewPeriodQuery>(res);
    const overview = await creatorOverviewService.getOverview(userId, days);
    sendSuccess(res, overview, "Your muse overview.");
  },
};
