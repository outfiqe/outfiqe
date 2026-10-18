import { useInfiniteCursorPage } from "@outfiqe/hooks";
import type { LogisticsAlertType } from "@outfiqe/utils";

import { alertsApi } from "../api/alertsApi";
import type { AlertListStatus } from "../api/alertsSchemas";
import { logisticsAlertsQueryKey } from "../constants/alertQueryKeys";

export const useInfiniteLogisticsAlerts = (
  status: AlertListStatus,
  alertType: LogisticsAlertType | null,
) =>
  useInfiniteCursorPage(logisticsAlertsQueryKey(status, alertType), (cursor) =>
    alertsApi.listAlerts(status, alertType, cursor),
  );
