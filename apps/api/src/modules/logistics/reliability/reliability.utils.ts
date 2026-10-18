import { isAfter } from "date-fns/isAfter";
import { subDays } from "date-fns/subDays";

import {
  BRAND_RELIABILITY_LEVEL,
  type BrandReliabilityLevel,
  NEW_BRAND_GRACE,
  RELIABILITY_THRESHOLDS,
} from "./reliability.constants.js";

const PERCENT_SCALE = 100;
const NO_PICKUPS = 0;
const NO_INCIDENTS = 0;

type ReliabilityThreshold = { minIncidents: number; minIncidentRatePercent: number };

export type ReliabilityFacts = {
  incidentCount: number;
  pickupCount: number;
  isNewToPickup: boolean;
};

export type HubPickupHistory = {
  firstPickupAt: Date | null;
  totalPickupCount: number;
};

export const calculateIncidentRatePercent = (incidentCount: number, pickupCount: number) => {
  if (pickupCount === NO_PICKUPS) {
    return incidentCount > NO_INCIDENTS ? PERCENT_SCALE : NO_INCIDENTS;
  }
  return Math.round((incidentCount * PERCENT_SCALE) / pickupCount);
};

const isPastThreshold = (
  { incidentCount, pickupCount }: ReliabilityFacts,
  { minIncidents, minIncidentRatePercent }: ReliabilityThreshold,
) =>
  incidentCount >= minIncidents &&
  incidentCount * PERCENT_SCALE > minIncidentRatePercent * pickupCount;

export const describeReliabilityLevel = (facts: ReliabilityFacts): BrandReliabilityLevel => {
  if (facts.isNewToPickup) return BRAND_RELIABILITY_LEVEL.GOOD;
  if (isPastThreshold(facts, RELIABILITY_THRESHOLDS.review)) return BRAND_RELIABILITY_LEVEL.REVIEW;
  if (isPastThreshold(facts, RELIABILITY_THRESHOLDS.warning)) {
    return BRAND_RELIABILITY_LEVEL.WARNING;
  }
  return BRAND_RELIABILITY_LEVEL.GOOD;
};

export const isWithinNewBrandGrace = (
  { firstPickupAt, totalPickupCount }: HubPickupHistory,
  now: Date,
) =>
  firstPickupAt === null ||
  isAfter(firstPickupAt, subDays(now, NEW_BRAND_GRACE.days)) ||
  totalPickupCount < NEW_BRAND_GRACE.pickups;
