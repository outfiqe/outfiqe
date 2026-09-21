import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { RecordTourOutcomeBody, TourKeyParam } from "./tour.schemas.js";
import { tourService } from "./tour.service.js";

export const tourController = {
  async listMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    sendSuccess(res, await tourService.listForUser(userId), "Tour progress.");
  },

  async recordMine(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { tourKey } = validated.params<TourKeyParam>(res);
    const { version, outcome } = validated.body<RecordTourOutcomeBody>(res);
    sendSuccess(
      res,
      await tourService.recordOutcome(userId, tourKey, version, outcome),
      "Tour progress saved.",
    );
  },
};
