import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ListOrderFeeSettingsHistoryQuery,
  UpdateOrderFeeSettingsBody,
} from "./orderFeeSettings.schemas.js";
import { orderFeeSettingsService } from "./orderFeeSettings.service.js";

export const orderFeeSettingsController = {
  async get(_req: Request, res: Response) {
    const settings = await orderFeeSettingsService.getSettings();
    sendSuccess(res, settings, "Order fee settings.");
  },

  async update(_req: Request, res: Response) {
    const body = validated.body<UpdateOrderFeeSettingsBody>(res);
    const { userId } = requireAuthPrincipal(res);
    const settings = await orderFeeSettingsService.updateSettings(userId, body);
    sendSuccess(res, settings, "Order fee settings updated.");
  },

  async listHistory(_req: Request, res: Response) {
    const query = validated.query<ListOrderFeeSettingsHistoryQuery>(res);
    const page = await orderFeeSettingsService.listHistory(query);
    sendSuccess(res, page, "Order fee settings history.");
  },
};
