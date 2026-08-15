import { ATTRIBUTION_WINDOW_MS } from "#constants/commerce.constants.js";
import { prisma } from "#db/prisma.js";
import { CommissionSource, CreatorLinkType } from "#generated/prisma/enums.js";

export type AttributionCandidate = {
  source: CommissionSource;
  creatorId: string;
  clickId: string;
  referenceId: string;
  clickedAt: Date;
};

const isEligible = (
  candidate: AttributionCandidate,
  buyerId: string,
  orderPlacedAt: Date,
): boolean => {
  const { clickedAt, creatorId } = candidate;
  const withinWindow = orderPlacedAt.getTime() - clickedAt.getTime() <= ATTRIBUTION_WINDOW_MS;
  return withinWindow && creatorId !== buyerId;
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
      creatorLook: { creatorId: { not: buyerId } },
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
      link: { creatorId: { not: buyerId }, OR: [{ productId }, { productId: null }] },
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

export const resolveAttribution = async (
  buyerId: string,
  productId: string,
  orderPlacedAt: Date,
): Promise<AttributionCandidate | null> => {
  const since = new Date(orderPlacedAt.getTime() - ATTRIBUTION_WINDOW_MS);
  const [tagClicks, linkClicks] = await Promise.all([
    fetchTagClickCandidates(buyerId, productId, since),
    fetchLinkClickCandidates(buyerId, productId, since),
  ]);

  const eligible = [...tagClicks, ...linkClicks].filter((candidate) =>
    isEligible(candidate, buyerId, orderPlacedAt),
  );

  return eligible.sort((a, b) => b.clickedAt.getTime() - a.clickedAt.getTime())[0] ?? null;
};
