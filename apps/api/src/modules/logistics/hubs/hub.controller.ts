import type { Request, Response } from "express";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { sendSuccess } from "#lib/api-response.utils.js";
import { validated } from "#middlewares/validate.js";

import type { HubBody, HubIdParam, SetHubPickupZonesBody } from "./hub.schemas.js";
import { logisticsHubService } from "./hub.service.js";

export const logisticsHubController = {
  async list(_req: Request, res: Response) {
    const hubs = await logisticsHubService.listHubs();
    sendSuccess(res, { hubs }, "Hubs.");
  },

  async create(_req: Request, res: Response) {
    const hub = await logisticsHubService.createHub(validated.body<HubBody>(res));
    sendSuccess(res, hub, "Hub created.", HTTP_STATUS.CREATED);
  },

  async update(_req: Request, res: Response) {
    const { hubId } = validated.params<HubIdParam>(res);
    const hub = await logisticsHubService.updateHub(hubId, validated.body<HubBody>(res));
    sendSuccess(res, hub, "Hub updated.");
  },

  async setPickupZones(_req: Request, res: Response) {
    const { hubId } = validated.params<HubIdParam>(res);
    const hub = await logisticsHubService.setHubPickupZones(
      hubId,
      validated.body<SetHubPickupZonesBody>(res),
    );
    sendSuccess(res, hub, "Hub pickup areas updated.");
  },
};
