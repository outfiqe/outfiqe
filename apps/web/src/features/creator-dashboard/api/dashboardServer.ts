import "server-only";

import { serverApiRequest } from "@/shared/lib/serverApiClient";

import { type BadgeCollectionEntry, badgeCollectionSchema } from "../badges/api/badgeSchemas";
import {
  type PublicChallenge,
  publicChallengeListSchema,
} from "../challenges/api/challengeSchemas";
import {
  type CommissionEligibility,
  commissionEligibilitySchema,
  type EarningsSummary,
  earningsSummarySchema,
} from "../earnings/api/commissionSchemas";
import { type XpProgress, xpProgressSchema } from "../progress/api/xpSchemas";

export const getEarningsSummaryServer = async (accessToken: string): Promise<EarningsSummary> => {
  const raw = await serverApiRequest<EarningsSummary>("/commissions/me/summary", { accessToken });
  return earningsSummarySchema.parse(raw);
};

export const getCommissionEligibilityServer = async (
  accessToken: string,
): Promise<CommissionEligibility> => {
  const raw = await serverApiRequest<CommissionEligibility>("/commissions/me/eligibility", {
    accessToken,
  });
  return commissionEligibilitySchema.parse(raw);
};

export const getBadgeCollectionServer = async (
  accessToken: string,
): Promise<BadgeCollectionEntry[]> => {
  const raw = await serverApiRequest<BadgeCollectionEntry[]>("/badges/collection", { accessToken });
  return badgeCollectionSchema.parse(raw);
};

export const getChallengesServer = async (accessToken: string): Promise<PublicChallenge[]> => {
  const raw = await serverApiRequest<PublicChallenge[]>("/challenges", { accessToken });
  return publicChallengeListSchema.parse(raw);
};

export const getXpProgressServer = async (accessToken: string): Promise<XpProgress | null> => {
  const raw = await serverApiRequest<XpProgress | null>("/xp/me", { accessToken });
  return xpProgressSchema.nullable().parse(raw);
};
