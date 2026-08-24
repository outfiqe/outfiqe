import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type { FinancialRollupQuery } from "./financialRollup.schemas.js";
import { financialRollupService } from "./financialRollup.service.js";

export const financialRollupController = {
  async get(_req: Request, res: Response) {
    const query = validated.query<FinancialRollupQuery>(res);
    const rollup = await financialRollupService.getRollup(query);
    sendSuccess(res, rollup, "Financial rollup.");
  },
};
