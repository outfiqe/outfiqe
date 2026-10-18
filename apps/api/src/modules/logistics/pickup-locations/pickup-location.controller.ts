import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type { PickupLocationBody, PickupLocationIdParam } from "./pickup-location.schemas.js";
import { logisticsPickupLocationService } from "./pickup-location.service.js";

export const logisticsPickupLocationController = {
  async list(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const pickupLocations = await logisticsPickupLocationService.listPickupLocations(userId);
    sendSuccess(res, { pickupLocations }, "Pickup locations.");
  },

  async create(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const pickupLocation = await logisticsPickupLocationService.createPickupLocation(
      userId,
      validated.body<PickupLocationBody>(res),
    );
    sendSuccess(res, pickupLocation, "Pickup location added.", HTTP_STATUS.CREATED);
  },

  async update(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { locationId } = validated.params<PickupLocationIdParam>(res);
    const pickupLocation = await logisticsPickupLocationService.updatePickupLocation(
      userId,
      locationId,
      validated.body<PickupLocationBody>(res),
    );
    sendSuccess(res, pickupLocation, "Pickup location updated.");
  },

  async makeDefault(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { locationId } = validated.params<PickupLocationIdParam>(res);
    await logisticsPickupLocationService.makeDefaultPickupLocation(userId, locationId);
    sendSuccess(res, null, "Default pickup location updated.");
  },

  async remove(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { locationId } = validated.params<PickupLocationIdParam>(res);
    await logisticsPickupLocationService.removePickupLocation(userId, locationId);
    sendSuccess(res, null, "Pickup location removed.");
  },
};
