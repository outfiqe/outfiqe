import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { ListEarningsQuery } from "./commission.schemas.js";
import { commissionService } from "./commission.service.js";

export const commissionController = {
  async getMySummary(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const summary = await commissionService.getEarningsSummary(userId);
    sendSuccess(res, summary, "Your earnings.");
  },

  async listMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListEarningsQuery>(res);

    const page = await commissionService.listEarnings(userId, query);
    sendSuccess(res, page, "Your earnings ledger.");
  },
};
