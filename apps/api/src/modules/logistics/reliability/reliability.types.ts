import type { BrandIncidentKind } from "#generated/prisma/enums.js";

import type { BrandReliabilityLevel } from "./reliability.constants.js";

export type BrandIncidentView = {
  id: string;
  kind: BrandIncidentKind;
  orderId: string | null;
  note: string | null;
  occurredAt: string;
};

export type BrandReliabilityView = {
  windowDays: number;
  incidentCount: number;
  level: BrandReliabilityLevel;
  warningAt: number;
  reviewAt: number;
  incidents: BrandIncidentView[];
  nextCursor: string | null;
};

export type BrandForReviewView = {
  brandId: string;
  brandName: string;
  incidentCount: number;
  level: BrandReliabilityLevel;
};
