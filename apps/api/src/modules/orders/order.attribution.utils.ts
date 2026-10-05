import { subMilliseconds } from "date-fns/subMilliseconds";

import { ATTRIBUTION_WINDOW_MS } from "#constants/commerce.constants.js";
import { prisma } from "#db/prisma.js";
import {
  AccountStatus,
  CommissionSource,
  CreatorLinkType,
  CreatorStatus,
  TagReviewStatus,
  UserRole,
} from "#generated/prisma/enums.js";
import type {
  CommissionRecipient,
  CommissionShare,
  CommissionTierRecord,
} from "#modules/commissions/commission.types.js";
import { splitBuildCommission } from "#modules/commissions/commission.utils.js";

type CreatorClickSource =
  | typeof CommissionSource.TAG_CLICK
  | typeof CommissionSource.INTERNAL_LINK
  | typeof CommissionSource.EXTERNAL_LINK;

export type CreatorClickAttribution = {
  source: CreatorClickSource;
  creatorId: string;
  clickId: string;
  referenceId: string;
  clickedAt: Date;
};

export type BuildVisitAttribution = {
  source: typeof CommissionSource.OUTFIT_BUILD;
  visitId: string;
  outfitId: string;
  outfitVersion: number;
  clickedAt: Date;
};

export type AttributionCandidate = CreatorClickAttribution | BuildVisitAttribution;

const isWithinWindow = (clickedAt: Date, orderPlacedAt: Date): boolean =>
  orderPlacedAt.getTime() - clickedAt.getTime() <= ATTRIBUTION_WINDOW_MS;

const isEligible = (
  candidate: AttributionCandidate,
  buyerId: string,
  orderPlacedAt: Date,
): boolean => {
  if (!isWithinWindow(candidate.clickedAt, orderPlacedAt)) return false;
  if (candidate.source === CommissionSource.OUTFIT_BUILD) return true;
  return candidate.creatorId !== buyerId;
};

const fetchTagClickCandidates = async (
  buyerId: string,
  productId: string,
  since: Date,
): Promise<AttributionCandidate[]> => {
  const clicks = await prisma.creatorLookTagClick.findMany({
    where: {
      userId: buyerId,
      productId,
      createdAt: { gte: since },
      creatorLook: {
        creatorId: { not: buyerId },
        creator: { creatorStatus: CreatorStatus.APPROVED },
        taggedProducts: { some: { productId, reviewStatus: TagReviewStatus.APPROVED } },
      },
    },
    select: {
      id: true,
      createdAt: true,
      creatorLookId: true,
      creatorLook: { select: { creatorId: true } },
    },
  });

  return clicks.map(({ id, createdAt, creatorLookId, creatorLook }) => ({
    source: CommissionSource.TAG_CLICK,
    creatorId: creatorLook.creatorId,
    clickId: id,
    referenceId: creatorLookId,
    clickedAt: createdAt,
  }));
};

const fetchLinkClickCandidates = async (
  buyerId: string,
  productId: string,
  since: Date,
): Promise<AttributionCandidate[]> => {
  const clicks = await prisma.creatorLinkClick.findMany({
    where: {
      userId: buyerId,
      createdAt: { gte: since },
      link: {
        creatorId: { not: buyerId },
        creator: { creatorStatus: CreatorStatus.APPROVED },
        OR: [{ productId }, { productId: null }],
      },
    },
    select: {
      id: true,
      createdAt: true,
      linkId: true,
      link: { select: { creatorId: true, type: true } },
    },
  });

  return clicks.map(({ id, createdAt, linkId, link }) => {
    const { creatorId, type } = link;
    return {
      source:
        type === CreatorLinkType.INTERNAL_SINGLE_USE
          ? CommissionSource.INTERNAL_LINK
          : CommissionSource.EXTERNAL_LINK,
      creatorId,
      clickId: id,
      referenceId: linkId,
      clickedAt: createdAt,
    };
  });
};

const fetchBuildVisitCandidates = async (
  buyerId: string,
  productId: string,
  since: Date,
): Promise<AttributionCandidate[]> => {
  const visits = await prisma.outfitBuildVisit.findMany({
    where: {
      userId: buyerId,
      productId,
      createdAt: { gte: since },
      outfit: { removedAt: null },
    },
    select: { id: true, outfitId: true, outfitVersion: true, createdAt: true },
  });

  return visits.map(({ id, outfitId, outfitVersion, createdAt }) => ({
    source: CommissionSource.OUTFIT_BUILD,
    visitId: id,
    outfitId,
    outfitVersion,
    clickedAt: createdAt,
  }));
};

export const resolveAttribution = async (
  buyerId: string,
  productId: string,
  orderPlacedAt: Date,
): Promise<AttributionCandidate | null> => {
  const since = subMilliseconds(orderPlacedAt, ATTRIBUTION_WINDOW_MS);
  const [tagClicks, linkClicks, buildVisits] = await Promise.all([
    fetchTagClickCandidates(buyerId, productId, since),
    fetchLinkClickCandidates(buyerId, productId, since),
    fetchBuildVisitCandidates(buyerId, productId, since),
  ]);

  const eligible = [...tagClicks, ...linkClicks, ...buildVisits].filter((candidate) =>
    isEligible(candidate, buyerId, orderPlacedAt),
  );

  return eligible.sort((a, b) => b.clickedAt.getTime() - a.clickedAt.getTime())[0] ?? null;
};

const findActiveContributorRecipients = async (
  contributorIds: string[],
): Promise<Map<string, CommissionRecipient>> => {
  const contributors = await prisma.user.findMany({
    where: {
      id: { in: contributorIds },
      accountStatus: AccountStatus.ACTIVE,
      role: { in: [UserRole.CUSTOMER, UserRole.BRAND_OWNER] },
    },
    select: {
      id: true,
      role: true,
      memberships: {
        where: { brand: { accountStatus: AccountStatus.ACTIVE } },
        orderBy: [{ role: "asc" }, { brandId: "asc" }],
        take: 1,
        select: { brandId: true },
      },
    },
  });

  const recipients = new Map<string, CommissionRecipient>();
  for (const { id, role, memberships } of contributors) {
    if (role === UserRole.CUSTOMER) {
      recipients.set(id, { creatorId: id });
      continue;
    }
    const [primaryMembership] = memberships;
    if (primaryMembership) recipients.set(id, { recipientBrandId: primaryMembership.brandId });
  }
  return recipients;
};

const resolveBuildShares = async (
  attribution: BuildVisitAttribution,
  tier: CommissionTierRecord,
  buyerId: string,
): Promise<CommissionShare[]> => {
  const { outfitId, outfitVersion } = attribution;
  const snapshot = await prisma.outfitSnapshot.findUnique({
    where: { outfitId_version: { outfitId, version: outfitVersion } },
    select: { contributorIds: true },
  });
  if (!snapshot) return [];

  const contributorShares = splitBuildCommission(tier.amount, snapshot.contributorIds, buyerId);
  const recipientByContributorId = await findActiveContributorRecipients(
    contributorShares.map(({ contributorId }) => contributorId),
  );

  return contributorShares.flatMap(({ contributorId, amount }) => {
    const recipient = recipientByContributorId.get(contributorId);
    return recipient ? [{ ...recipient, amount }] : [];
  });
};

export type CommissionClickReference =
  { buildVisitId: string } | { tagClickId: string } | { linkClickId: string };

export const toCommissionClickReference = (
  attribution: AttributionCandidate,
): CommissionClickReference => {
  if (attribution.source === CommissionSource.OUTFIT_BUILD) {
    return { buildVisitId: attribution.visitId };
  }
  if (attribution.source === CommissionSource.TAG_CLICK) {
    return { tagClickId: attribution.clickId };
  }
  return { linkClickId: attribution.clickId };
};

export const resolveCommissionShares = async (
  attribution: AttributionCandidate,
  tier: CommissionTierRecord,
  buyerId: string,
): Promise<CommissionShare[]> => {
  if (attribution.source === CommissionSource.OUTFIT_BUILD) {
    return resolveBuildShares(attribution, tier, buyerId);
  }
  return [{ creatorId: attribution.creatorId, amount: tier.amount }];
};
