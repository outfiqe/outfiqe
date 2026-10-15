import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { PickupGroupIdParam } from "./pickup.schemas.js";
import { logisticsPickupService } from "./pickup.service.js";

export const logisticsPickupController = {
  async markReady(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { fulfilmentGroupId } = validated.params<PickupGroupIdParam>(res);
    const pickup = await logisticsPickupService.markReadyForPickup(userId, fulfilmentGroupId);
    sendSuccess(res, pickup, "Marked ready for pickup.");
  },
};
