import type { BrandIncidentKind } from "#generated/prisma/enums.js";

import type { BrandReliabilityLevel } from "./reliability.constants.js";

export type BrandIncidentView = {
  id: string;
  kind: BrandIncidentKind;
  orderId: string | null;
  note: string | null;
  occurredAt: string;
};

export type BrandReliabilitySummary = {
  incidentCount: number;
  pickupCount: number;
  incidentRatePercent: number;
  isNewToPickup: boolean;
  level: BrandReliabilityLevel;
};

export type BrandReliabilityView = BrandReliabilitySummary & {
  windowDays: number;
  incidents: BrandIncidentView[];
  nextCursor: string | null;
};

export type BrandForReviewView = BrandReliabilitySummary & {
  brandId: string;
  brandName: string;
};
