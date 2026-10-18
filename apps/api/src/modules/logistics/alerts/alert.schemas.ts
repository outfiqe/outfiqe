import { z } from "zod";

import { LogisticsAlertType } from "#generated/prisma/enums.js";

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const MIN_NOTE_LENGTH = 3;
const MAX_NOTE_LENGTH = 500;

export const ALERT_LIST_STATUS: { readonly OPEN: "OPEN"; readonly RESOLVED: "RESOLVED" } = {
  OPEN: "OPEN",
  RESOLVED: "RESOLVED",
};

export const listLogisticsAlertsQuerySchema = z.object({
  status: z.enum(ALERT_LIST_STATUS).default(ALERT_LIST_STATUS.OPEN),
  alertType: z.enum(LogisticsAlertType).optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export const logisticsAlertParamSchema = z.object({ alertId: z.uuid() });

export const resolveLogisticsAlertSchema = z.object({
  note: z.string().trim().min(MIN_NOTE_LENGTH).max(MAX_NOTE_LENGTH),
});

export type ListLogisticsAlertsQuery = z.infer<typeof listLogisticsAlertsQuerySchema>;
export type LogisticsAlertParam = z.infer<typeof logisticsAlertParamSchema>;
export type ResolveLogisticsAlertBody = z.infer<typeof resolveLogisticsAlertSchema>;
