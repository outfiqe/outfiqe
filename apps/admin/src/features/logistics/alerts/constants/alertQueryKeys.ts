export const LOGISTICS_ALERTS_QUERY_KEY = ["logistics-alerts"] as const;

export const logisticsAlertsQueryKey = (status: string, alertType: string | null) =>
  [...LOGISTICS_ALERTS_QUERY_KEY, status, alertType ?? "all"] as const;
