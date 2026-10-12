import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { SaveFitProfileBody } from "./fit-profile.schemas.js";
import { fitProfileService } from "./fit-profile.service.js";

export const fitProfileController = {
  async getMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    sendSuccess(res, await fitProfileService.getMine(userId), "Your measurements.");
  },

  async saveMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const measurements = validated.body<SaveFitProfileBody>(res);
    sendSuccess(res, await fitProfileService.save(userId, measurements), "Measurements saved.");
  },

  async removeMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    await fitProfileService.remove(userId);
    sendSuccess(res, null, "Measurements removed.");
  },
};
