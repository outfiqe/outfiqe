import { useApiMutation } from "@outfiqe/hooks";

import type { ApiClientError } from "@/lib/apiClient";

import { alertsApi } from "../api/alertsApi";
import type { LogisticsAlert } from "../api/alertsSchemas";
import { LOGISTICS_ALERTS_QUERY_KEY } from "../constants/alertQueryKeys";

export const useResolveLogisticsAlert = () =>
  useApiMutation<LogisticsAlert, ApiClientError, { alertId: string; note: string }>({
    successMessage: "Alert resolved.",
    mutationFn: ({ alertId, note }) => alertsApi.resolveAlert(alertId, note),
    invalidateKeys: [LOGISTICS_ALERTS_QUERY_KEY],
  });
