import { z } from "zod";

import {
  DeliveryFailureReason,
  PartnerWebhookVerification,
  TrackingEventCode,
} from "#generated/prisma/enums.js";
import { countryCodeSchema } from "#lib/country.utils.js";

import { isKnownPartnerAdapterKey } from "./adapters/partner-adapter.registry.js";
import { compileReferencePattern } from "./partner-status.utils.js";

export const PARTNER_CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,39}$/;
const CREDENTIALS_KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,39}$/;
const MAX_REFERENCE_PATTERN_LENGTH = 120;
const MAX_COD_REMITTANCE_DAYS = 60;
const MAX_ZONES_PER_REPLACE = 300;
const MAX_ZONE_PRIORITY = 100;
const MAX_STATUS_MAPPINGS_PER_SAVE = 200;
const MAX_RAW_STATUS_LENGTH = 120;
const MAX_IMPORT_FILE_NAME_LENGTH = 200;
const MAX_IMPORT_CSV_LENGTH = 80_000;
const DEFAULT_COD_REMITTANCE_DAYS = 7;

const PARTNER_STATUS_CODES = [
  TrackingEventCode.HANDED_TO_PARTNER,
  TrackingEventCode.IN_TRANSIT,
  TrackingEventCode.OUT_FOR_DELIVERY,
  TrackingEventCode.DELIVERY_FAILED,
  TrackingEventCode.DELIVERED,
  TrackingEventCode.RETURNING,
  TrackingEventCode.RETURNED_TO_HUB,
  TrackingEventCode.LOST,
  TrackingEventCode.DELIVERY_RESCHEDULED,
  TrackingEventCode.NOTE,
] as const;

const hasNoDuplicates = <Value>(values: readonly Value[]) => new Set(values).size === values.length;

const urlTemplateSchema = z
  .string()
  .trim()
  .url()
  .refine((template) => template.includes("{reference}"), {
    message: "Put {reference} where the partner's parcel number goes.",
  });

export const partnerBodySchema = z.object({
  code: z
    .string()
    .trim()
    .toLowerCase()
    .regex(PARTNER_CODE_PATTERN, "Use lowercase letters, numbers and dashes, for example pathao."),
  name: z.string().trim().min(1).max(80),
  countryCode: countryCodeSchema,
  adapterKey: z.string().refine(isKnownPartnerAdapterKey, "That connection type isn't available."),
  isActive: z.boolean().default(true),
  supportsCod: z.boolean().default(true),
  supportsCodAmountUpdate: z.boolean().default(false),
  supportsCancel: z.boolean().default(false),
  webhookVerification: z.enum(PartnerWebhookVerification).default(PartnerWebhookVerification.NONE),
  referencePattern: z
    .string()
    .trim()
    .min(1)
    .max(MAX_REFERENCE_PATTERN_LENGTH)
    .refine((pattern) => compileReferencePattern(pattern) !== null, "That pattern isn't valid.")
    .nullable()
    .default(null),
  codRemittanceDays: z
    .number()
    .int()
    .min(0)
    .max(MAX_COD_REMITTANCE_DAYS)
    .default(DEFAULT_COD_REMITTANCE_DAYS),
  trackingUrlTemplate: urlTemplateSchema.nullable().default(null),
});

export const partnerIdParamSchema = z.object({ partnerId: z.uuid() });

export const partnerAccountParamSchema = z.object({ partnerId: z.uuid(), hubId: z.uuid() });

export const partnerAccountBodySchema = z.object({
  merchantAccountRef: z.string().trim().min(1).max(80),
  pickupPointRef: z.string().trim().min(1).max(80).nullable().default(null),
  credentialsKey: z
    .string()
    .trim()
    .regex(
      CREDENTIALS_KEY_PATTERN,
      "Use capitals, numbers and underscores, for example PATHAO_KTM.",
    )
    .nullable()
    .default(null),
  isActive: z.boolean().default(true),
});

export const replacePartnerZonesSchema = z.object({
  hubId: z.uuid(),
  zones: z
    .array(
      z.object({
        deliveryZoneId: z.uuid(),
        priority: z.number().int().min(0).max(MAX_ZONE_PRIORITY),
        isActive: z.boolean().default(true),
      }),
    )
    .max(MAX_ZONES_PER_REPLACE)
    .refine(
      (zones) => hasNoDuplicates(zones.map(({ deliveryZoneId }) => deliveryZoneId)),
      "Each zone can only be listed once.",
    ),
});

export const savePartnerStatusMapSchema = z.object({
  mappings: z
    .array(
      z.object({
        rawStatus: z.string().trim().min(1).max(MAX_RAW_STATUS_LENGTH),
        canonicalCode: z.enum(PARTNER_STATUS_CODES),
        reasonCode: z.enum(DeliveryFailureReason).nullable().default(null),
      }),
    )
    .max(MAX_STATUS_MAPPINGS_PER_SAVE),
});

export const createPartnerStatusImportSchema = z.object({
  fileName: z.string().trim().min(1).max(MAX_IMPORT_FILE_NAME_LENGTH),
  csv: z
    .string()
    .min(1)
    .max(
      MAX_IMPORT_CSV_LENGTH,
      "That sheet is too big. Split it into smaller files and upload each one.",
    ),
});

export const partnerStatusImportParamSchema = z.object({
  partnerId: z.uuid(),
  importId: z.uuid(),
});

export type PartnerBody = z.infer<typeof partnerBodySchema>;
export type PartnerIdParam = z.infer<typeof partnerIdParamSchema>;
export type PartnerAccountParam = z.infer<typeof partnerAccountParamSchema>;
export type PartnerAccountBody = z.infer<typeof partnerAccountBodySchema>;
export type ReplacePartnerZonesBody = z.infer<typeof replacePartnerZonesSchema>;
export type SavePartnerStatusMapBody = z.infer<typeof savePartnerStatusMapSchema>;
export type CreatePartnerStatusImportBody = z.infer<typeof createPartnerStatusImportSchema>;
export type PartnerStatusImportParam = z.infer<typeof partnerStatusImportParamSchema>;
