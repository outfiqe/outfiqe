import type { LogisticsAlertType } from "@outfiqe/utils";

import { apiClient } from "@/lib/apiClient";

import {
  type AlertListStatus,
  type LogisticsAlert,
  type LogisticsAlertPage,
  logisticsAlertPageSchema,
  logisticsAlertSchema,
} from "./alertsSchemas";

const ALERTS_PATH = "/logistics/admin/alerts";

export const alertsApi = {
  async listAlerts(
    status: AlertListStatus,
    alertType: LogisticsAlertType | null,
    cursor?: string,
  ): Promise<LogisticsAlertPage> {
    const res = await apiClient.get(ALERTS_PATH, {
      params: { status, cursor, ...(alertType ? { alertType } : {}) },
    });
    return logisticsAlertPageSchema.parse(res.data);
  },

  async resolveAlert(alertId: string, note: string): Promise<LogisticsAlert> {
    const res = await apiClient.post(`${ALERTS_PATH}/${alertId}/resolve`, { note });
    return logisticsAlertSchema.parse(res.data);
  },
};
