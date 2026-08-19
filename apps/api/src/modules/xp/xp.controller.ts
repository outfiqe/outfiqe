import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { ListXpTransactionsQuery } from "./xp.schemas.js";
import { xpService } from "./xp.service.js";

const NEWCOMER_PROGRESS_MESSAGE = "You haven't earned any XP yet.";

export const xpController = {
  async getMyProgress(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const progress = await xpService.getProgressForUser(userId);
    sendSuccess(res, progress, progress ? "Your progress." : NEWCOMER_PROGRESS_MESSAGE);
  },

  async listMyTransactions(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const query = validated.query<ListXpTransactionsQuery>(res);

    const page = await xpService.listTransactionsForUser(userId, query);
    sendSuccess(res, page, "Your XP history.");
  },
};
