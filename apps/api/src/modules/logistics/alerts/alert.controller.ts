import type { Request, Response } from "express";

import { sendSuccess } from "#lib/api-response.utils.js";
import { requireAuthPrincipal } from "#middlewares/require-auth.js";
import { validated } from "#middlewares/validate.js";

import type {
  ListLogisticsAlertsQuery,
  LogisticsAlertParam,
  ResolveLogisticsAlertBody,
} from "./alert.schemas.js";
import { logisticsAlertService } from "./alert.service.js";

export const logisticsAlertController = {
  async listAlerts(_req: Request, res: Response) {
    const alerts = await logisticsAlertService.listLogisticsAlerts(
      validated.query<ListLogisticsAlertsQuery>(res),
    );
    sendSuccess(res, alerts, "Delivery alerts.");
  },

  async resolveAlert(_req: Request, res: Response) {
    const { userId } = requireAuthPrincipal(res);
    const { alertId } = validated.params<LogisticsAlertParam>(res);
    const { note } = validated.body<ResolveLogisticsAlertBody>(res);
    const alert = await logisticsAlertService.resolveLogisticsAlert(userId, alertId, note);
    sendSuccess(res, alert, "Alert resolved.");
  },
};
