import { z } from "zod";

export const WEBHOOK_VERIFICATIONS = [
  "SIGNATURE",
  "HEADER_TOKEN",
  "NOTIFY_THEN_FETCH",
  "NONE",
] as const;

export const PARTNER_STATUS_CODES = [
  "HANDED_TO_PARTNER",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERY_FAILED",
  "DELIVERED",
  "RETURNING",
  "RETURNED_TO_HUB",
  "LOST",
  "DELIVERY_RESCHEDULED",
  "NOTE",
] as const;
export const partnerStatusCodeSchema = z.enum(PARTNER_STATUS_CODES);
export type PartnerStatusCode = z.infer<typeof partnerStatusCodeSchema>;

export const IMPORT_ROW_OUTCOMES = [
  "APPLIED",
  "NOT_APPLIED",
  "DUPLICATE",
  "UNMATCHED_REFERENCE",
  "UNKNOWN_STATUS",
  "INVALID_ROW",
] as const;
export type ImportRowOutcome = (typeof IMPORT_ROW_OUTCOMES)[number];

export const deliveryPartnerSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  countryCode: z.string(),
  adapterKey: z.string(),
  isActive: z.boolean(),
  supportsBooking: z.boolean(),
  supportsWebhooks: z.boolean(),
  supportsPolling: z.boolean(),
  supportsCod: z.boolean(),
  supportsCodAmountUpdate: z.boolean(),
  supportsCancel: z.boolean(),
  webhookVerification: z.enum(WEBHOOK_VERIFICATIONS),
  referencePattern: z.string().nullable(),
  codRemittanceDays: z.number(),
  trackingUrlTemplate: z.string().nullable(),
  accounts: z.array(
    z.object({
      hubId: z.string(),
      hubName: z.string(),
      merchantAccountRef: z.string(),
      pickupPointRef: z.string().nullable(),
      credentialsKey: z.string().nullable(),
      isActive: z.boolean(),
    }),
  ),
  zones: z.array(
    z.object({
      hubId: z.string(),
      deliveryZoneId: z.string(),
      deliveryZoneName: z.string(),
      priority: z.number(),
      isActive: z.boolean(),
    }),
  ),
  statusMappings: z.array(
    z.object({
      rawStatus: z.string(),
      canonicalCode: partnerStatusCodeSchema,
      reasonCode: z.string().nullable(),
    }),
  ),
});
export type DeliveryPartner = z.infer<typeof deliveryPartnerSchema>;

export const deliveryPartnersResponseSchema = z.object({
  partners: z.array(deliveryPartnerSchema),
});

export const statusImportSchema = z.object({
  id: z.string(),
  partnerId: z.string(),
  fileName: z.string(),
  rowCount: z.number(),
  appliedCount: z.number(),
  createdAt: z.string(),
  rows: z.array(
    z.object({
      rowNumber: z.number(),
      partnerReference: z.string().nullable(),
      merchantReference: z.string().nullable(),
      rawStatus: z.string().nullable(),
      outcome: z.enum(IMPORT_ROW_OUTCOMES),
      message: z.string().nullable(),
    }),
  ),
});
export type StatusImport = z.infer<typeof statusImportSchema>;

export type DeliveryPartnerBody = {
  code: string;
  name: string;
  countryCode: string;
  adapterKey: string;
  isActive: boolean;
  supportsCod: boolean;
  referencePattern: string | null;
  codRemittanceDays: number;
  trackingUrlTemplate: string | null;
};

export type PartnerAccountBody = {
  merchantAccountRef: string;
  pickupPointRef: string | null;
  credentialsKey: string | null;
  isActive: boolean;
};

export type PartnerZonesBody = {
  hubId: string;
  zones: { deliveryZoneId: string; priority: number; isActive: boolean }[];
};

export type PartnerStatusMapping = { rawStatus: string; canonicalCode: PartnerStatusCode };
