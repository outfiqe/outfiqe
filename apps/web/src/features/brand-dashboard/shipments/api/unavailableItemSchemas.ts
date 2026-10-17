import { z } from "zod";

export const UNAVAILABLE_ITEM_REPORT_STATUS = ["PENDING", "APPROVED", "REJECTED"] as const;
export const unavailableItemReportStatusSchema = z.enum(UNAVAILABLE_ITEM_REPORT_STATUS);
export type UnavailableItemReportStatus = z.infer<typeof unavailableItemReportStatusSchema>;

export const unavailableItemReportSchema = z.object({
  id: z.string(),
  orderItemId: z.string(),
  productName: z.string(),
  sizeLabel: z.string(),
  qty: z.number(),
  reason: z.string(),
  status: unavailableItemReportStatusSchema,
  decisionNote: z.string().nullable(),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
});
export type UnavailableItemReport = z.infer<typeof unavailableItemReportSchema>;

export const unavailableItemReportsResponseSchema = z.object({
  requests: z.array(unavailableItemReportSchema),
});

export type ReportUnavailableItemsBody = {
  lines: { orderItemId: string; qty: number }[];
  reason: string;
};
