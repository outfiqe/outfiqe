import { z } from "zod";

export const codPartnerSummarySchema = z.object({
  partnerId: z.string(),
  partnerName: z.string(),
  currency: z.string(),
  codRemittanceDays: z.number(),
  unremittedParcelCount: z.number(),
  unremittedAmount: z.number(),
  overdueParcelCount: z.number(),
  overdueAmount: z.number(),
  oldestDeliveredAt: z.string(),
});
export type CodPartnerSummary = z.infer<typeof codPartnerSummarySchema>;

export const codSummaryResponseSchema = z.object({ partners: z.array(codPartnerSummarySchema) });

export const unremittedParcelSchema = z.object({
  shipmentId: z.string(),
  trackingCode: z.string(),
  orderId: z.string(),
  currency: z.string(),
  partnerReference: z.string().nullable(),
  quotedPartnerFee: z.number().nullable(),
  expectedAmount: z.number(),
  collectedAmount: z.number(),
  hasCashMismatch: z.boolean(),
  deliveredAt: z.string(),
  remitBy: z.string(),
  isOverdue: z.boolean(),
});
export type UnremittedParcel = z.infer<typeof unremittedParcelSchema>;

export const unremittedParcelPageSchema = z.object({
  items: z.array(unremittedParcelSchema),
  nextCursor: z.string().nullable(),
});
export type UnremittedParcelPage = z.infer<typeof unremittedParcelPageSchema>;

export const codRemittanceSummarySchema = z.object({
  id: z.string(),
  partnerId: z.string(),
  partnerName: z.string(),
  reference: z.string(),
  currency: z.string(),
  receivedAt: z.string(),
  collectedAmount: z.number(),
  partnerFeeAmount: z.number(),
  receivedAmount: z.number(),
  parcelCount: z.number(),
  recordedByName: z.string().nullable(),
  createdAt: z.string(),
});
export type CodRemittanceSummary = z.infer<typeof codRemittanceSummarySchema>;

export const codRemittancePageSchema = z.object({
  items: z.array(codRemittanceSummarySchema),
  nextCursor: z.string().nullable(),
});
export type CodRemittancePage = z.infer<typeof codRemittancePageSchema>;

export const codRemittanceDetailSchema = codRemittanceSummarySchema.extend({
  note: z.string().nullable(),
  lines: z.array(
    z.object({
      shipmentId: z.string(),
      trackingCode: z.string(),
      orderId: z.string(),
      collectedAmount: z.number(),
      partnerFeeAmount: z.number(),
    }),
  ),
});
export type CodRemittanceDetail = z.infer<typeof codRemittanceDetailSchema>;

export type RecordCodRemittanceBody = {
  partnerId: string;
  reference: string;
  receivedAt: string;
  receivedAmount: number;
  note?: string;
  lines: { shipmentId: string; partnerFeeAmount: number }[];
};
