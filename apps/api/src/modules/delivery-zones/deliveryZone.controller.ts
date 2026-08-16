import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  CreateDeliveryZoneBody,
  DeliveryZoneIdParam,
  ListDeliveryZoneHistoryQuery,
  SearchDeliveryZoneCitiesQuery,
  UpdateDeliveryZoneBody,
} from "./deliveryZone.schemas.js";
import { deliveryZoneService } from "./deliveryZone.service.js";

const CREATED_STATUS = 201;

export const deliveryZoneController = {
  async list(_req: Request, res: Response) {
    const zones = await deliveryZoneService.listPublic();
    sendSuccess(res, zones, "Delivery zones.");
  },

  async listHistory(_req: Request, res: Response) {
    const query = validated.query<ListDeliveryZoneHistoryQuery>(res);
    const page = await deliveryZoneService.listHistory(query);
    sendSuccess(res, page, "Delivery zone change history.");
  },

  async searchCities(_req: Request, res: Response) {
    const { q, limit } = validated.query<SearchDeliveryZoneCitiesQuery>(res);
    const cities = await deliveryZoneService.searchCities(q, limit);
    sendSuccess(res, { cities }, "Delivery zone cities.");
  },

  async create(_req: Request, res: Response) {
    const body = validated.body<CreateDeliveryZoneBody>(res);
    const zone = await deliveryZoneService.createZone(body);
    sendSuccess(res, zone, "Delivery zone created.", CREATED_STATUS);
  },

  async update(_req: Request, res: Response) {
    const { zoneId } = validated.params<DeliveryZoneIdParam>(res);
    const body = validated.body<UpdateDeliveryZoneBody>(res);
    const { userId } = requireAuthPrincipal(res);
    const zone = await deliveryZoneService.updateZone(zoneId, userId, body);
    sendSuccess(res, zone, "Delivery zone updated.");
  },

  async setDefault(_req: Request, res: Response) {
    const { zoneId } = validated.params<DeliveryZoneIdParam>(res);
    const { userId } = requireAuthPrincipal(res);
    const zone = await deliveryZoneService.setDefaultZone(zoneId, userId);
    sendSuccess(res, zone, "Default delivery zone updated.");
  },

  async remove(_req: Request, res: Response) {
    const { zoneId } = validated.params<DeliveryZoneIdParam>(res);
    await deliveryZoneService.deleteZone(zoneId);
    sendSuccess(res, null, "Delivery zone deleted.");
  },
};
