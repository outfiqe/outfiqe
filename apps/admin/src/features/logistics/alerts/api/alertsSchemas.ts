import { LOGISTICS_ALERT_TYPES } from "@outfiqe/utils";
import { z } from "zod";

export const logisticsAlertTypeSchema = z.enum(LOGISTICS_ALERT_TYPES);

export const ALERT_LIST_STATUSES = ["OPEN", "RESOLVED"] as const;
export type AlertListStatus = (typeof ALERT_LIST_STATUSES)[number];

export const logisticsAlertSchema = z.object({
  id: z.string(),
  alertType: logisticsAlertTypeSchema,
  orderId: z.string().nullable(),
  fulfilmentGroupId: z.string().nullable(),
  shipmentId: z.string().nullable(),
  trackingCode: z.string().nullable(),
  brandName: z.string().nullable(),
  hubName: z.string().nullable(),
  detail: z.string().nullable(),
  raisedAt: z.string(),
  resolvedAt: z.string().nullable(),
  isAutoResolved: z.boolean(),
  resolutionNote: z.string().nullable(),
  resolvedByName: z.string().nullable(),
});
export type LogisticsAlert = z.infer<typeof logisticsAlertSchema>;

export const logisticsAlertPageSchema = z.object({
  items: z.array(logisticsAlertSchema),
  nextCursor: z.string().nullable(),
  openCounts: z.array(z.object({ alertType: logisticsAlertTypeSchema, openCount: z.number() })),
});
export type LogisticsAlertPage = z.infer<typeof logisticsAlertPageSchema>;
