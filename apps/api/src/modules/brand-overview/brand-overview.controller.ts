import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import type { OverviewPeriodQuery } from "#lib/overview-period.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import { brandOverviewService } from "./brand-overview.service.js";

export const brandOverviewController = {
  async getMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const brandId = await requireBrandId(userId);
    const { days } = validated.query<OverviewPeriodQuery>(res);
    const overview = await brandOverviewService.getOverview(brandId, days);
    sendSuccess(res, overview, "Your brand overview.");
  },
};
