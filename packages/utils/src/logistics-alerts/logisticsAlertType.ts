export const LogisticsAlertType = {
  BRAND_NOT_READY: "BRAND_NOT_READY",
  BRAND_NOT_READY_ESCALATED: "BRAND_NOT_READY_ESCALATED",
  MISSED_ROUND: "MISSED_ROUND",
  WAITING_AT_HUB: "WAITING_AT_HUB",
  PARTNER_NOT_COLLECTED: "PARTNER_NOT_COLLECTED",
  NO_PARTNER_UPDATE: "NO_PARTNER_UPDATE",
  PROMISE_AT_RISK: "PROMISE_AT_RISK",
  PROMISE_MISSED: "PROMISE_MISSED",
  UNKNOWN_PARTNER_STATUS: "UNKNOWN_PARTNER_STATUS",
  COUNT_MISMATCH: "COUNT_MISMATCH",
  COD_COLLECTED_MISMATCH: "COD_COLLECTED_MISMATCH",
  COD_REMITTANCE_OVERDUE: "COD_REMITTANCE_OVERDUE",
  DELIVERY_DISPUTED: "DELIVERY_DISPUTED",
} as const;
export type LogisticsAlertType = (typeof LogisticsAlertType)[keyof typeof LogisticsAlertType];

export const LOGISTICS_ALERT_TYPES: readonly LogisticsAlertType[] =
  Object.values(LogisticsAlertType);

export const LOGISTICS_ALERT_LABELS: Readonly<Record<LogisticsAlertType, string>> = {
  [LogisticsAlertType.BRAND_NOT_READY]: "Brand hasn't marked a bag ready",
  [LogisticsAlertType.BRAND_NOT_READY_ESCALATED]: "Brand still hasn't marked a bag ready",
  [LogisticsAlertType.MISSED_ROUND]: "A rider round missed a bag",
  [LogisticsAlertType.WAITING_AT_HUB]: "A bag is waiting at the hub without its parcel",
  [LogisticsAlertType.PARTNER_NOT_COLLECTED]: "The delivery partner hasn't collected a parcel",
  [LogisticsAlertType.NO_PARTNER_UPDATE]: "No update from the delivery partner",
  [LogisticsAlertType.PROMISE_AT_RISK]: "An order may miss its delivery date",
  [LogisticsAlertType.PROMISE_MISSED]: "An order missed its delivery date",
  [LogisticsAlertType.UNKNOWN_PARTNER_STATUS]: "A partner status we don't know yet",
  [LogisticsAlertType.COUNT_MISMATCH]: "A bag's unit count didn't match",
  [LogisticsAlertType.COD_COLLECTED_MISMATCH]: "Cash collected didn't match the label",
  [LogisticsAlertType.COD_REMITTANCE_OVERDUE]: "A partner is late paying in cash",
  [LogisticsAlertType.DELIVERY_DISPUTED]: "A customer says their parcel didn't arrive",
};

export const isLogisticsAlertType = (value: unknown): value is LogisticsAlertType =>
  typeof value === "string" && LOGISTICS_ALERT_TYPES.some((alertType) => alertType === value);
