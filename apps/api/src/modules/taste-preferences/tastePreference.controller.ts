import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { SetTastePreferenceBody } from "./tastePreference.schemas.js";
import { tastePreferenceService } from "./tastePreference.service.js";

export const tastePreferenceController = {
  async getMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    sendSuccess(res, await tastePreferenceService.getForUser(userId), "Taste preferences.");
  },

  async setMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { categorySlugs } = validated.body<SetTastePreferenceBody>(res);
    await tastePreferenceService.setForUser(userId, categorySlugs);
    sendSuccess(res, await tastePreferenceService.getForUser(userId), "Taste preferences updated.");
  },

  async clearMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    await tastePreferenceService.clearForUser(userId);
    sendSuccess(res, { categorySlugs: null }, "Taste preferences cleared.");
  },

  async listPopularity(_req: Request, res: Response) {
    sendSuccess(res, await tastePreferenceService.listCategoryPopularity(), "Category popularity.");
  },
};
