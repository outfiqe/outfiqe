import { z } from "zod";

export const BRAND_INCIDENT_KINDS = [
  "UNAVAILABLE_ITEM",
  "FAILED_INSPECTION",
  "WASTED_VISIT",
  "MISSED_ROUND",
] as const;
export type BrandIncidentKind = (typeof BRAND_INCIDENT_KINDS)[number];

export const RELIABILITY_LEVELS = ["GOOD", "WARNING", "REVIEW"] as const;
export type ReliabilityLevel = (typeof RELIABILITY_LEVELS)[number];

export const deliveryReliabilitySchema = z.object({
  windowDays: z.number(),
  incidentCount: z.number(),
  level: z.enum(RELIABILITY_LEVELS),
  warningAt: z.number(),
  reviewAt: z.number(),
  incidents: z.array(
    z.object({
      id: z.string(),
      kind: z.enum(BRAND_INCIDENT_KINDS),
      orderId: z.string().nullable(),
      note: z.string().nullable(),
      occurredAt: z.string(),
    }),
  ),
  nextCursor: z.string().nullable(),
});
export type DeliveryReliability = z.infer<typeof deliveryReliabilitySchema>;
