import type { LogisticsAlertType } from "#generated/prisma/enums.js";

export type AlertToRaise = {
  alertType: LogisticsAlertType;
  subjectKey: string;
  orderId?: string | null;
  fulfilmentGroupId?: string | null;
  shipmentId?: string | null;
  brandId?: string | null;
  hubId?: string | null;
  detail?: string;
};

export type LogisticsAlertView = {
  id: string;
  alertType: LogisticsAlertType;
  orderId: string | null;
  fulfilmentGroupId: string | null;
  shipmentId: string | null;
  trackingCode: string | null;
  brandName: string | null;
  hubName: string | null;
  detail: string | null;
  raisedAt: string;
  resolvedAt: string | null;
  isAutoResolved: boolean;
  resolutionNote: string | null;
  resolvedByName: string | null;
};

export type OpenAlertCountView = { alertType: LogisticsAlertType; openCount: number };
