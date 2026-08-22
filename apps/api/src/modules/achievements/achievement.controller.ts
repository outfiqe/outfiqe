import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";

import { achievementService } from "./achievement.service.js";

export const achievementController = {
  async listMyProgress(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const progress = await achievementService.listProgressForUser(userId);
    sendSuccess(res, progress, "Your achievement progress.");
  },
};
