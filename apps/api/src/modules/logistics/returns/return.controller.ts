import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { CheckInReturnedParcelBody, ReturnShipmentParam } from "./return.schemas.js";
import { logisticsReturnCheckInService } from "./return-check-in.service.js";

export const logisticsReturnController = {
  async checkInReturnedParcel(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { shipmentId } = validated.params<ReturnShipmentParam>(res);
    const returnedParcel = await logisticsReturnCheckInService.checkInReturnedParcel(
      userId,
      shipmentId,
      validated.body<CheckInReturnedParcelBody>(res),
    );
    sendSuccess(res, returnedParcel, "Return checked in.");
  },
};
