import { prisma } from "#db/prisma.js";
import { CreatorStatus, TagReviewStatus } from "#generated/prisma/enums.js";

import { PRODUCT_RATING_MAX, PRODUCT_RATING_MIN } from "../product.constants.js";
import type { SeenOnCreator } from "../product.types.js";

const SEEN_ON_CREATORS_LIMIT = 5;

type RatingCountField =
  "rating1Count" | "rating2Count" | "rating3Count" | "rating4Count" | "rating5Count";

const RATING_COUNT_FIELD_BY_VALUE: Record<number, RatingCountField> = {
  1: "rating1Count",
  2: "rating2Count",
  3: "rating3Count",
  4: "rating4Count",
  5: "rating5Count",
};

export const productSocialProofRepository = {
  async countDistinctApprovedCreators(productId: string): Promise<number> {
    const creators = await prisma.creatorLook.findMany({
      where: {
        deletedAt: null,
        creator: { creatorStatus: CreatorStatus.APPROVED },
        taggedProducts: { some: { productId, reviewStatus: TagReviewStatus.APPROVED } },
      },
      select: { creatorId: true },
      distinct: ["creatorId"],
    });
    return creators.length;
  },

  async listSeenOnCreators(productId: string): Promise<SeenOnCreator[]> {
    const rows = await prisma.creatorLookProduct.findMany({
      where: {
        productId,
        reviewStatus: TagReviewStatus.APPROVED,
        creatorLook: { deletedAt: null, creator: { creatorStatus: CreatorStatus.APPROVED } },
      },
      select: {
        sizeWorn: true,
        creatorLook: {
          select: {
            id: true,
            imageUrl: true,
            creator: {
              select: { id: true, name: true, handle: true, heightCm: true, showHeight: true },
            },
          },
        },
      },
      orderBy: { creatorLook: { createdAt: "desc" } },
    });

    const byCreator = new Map<string, SeenOnCreator>();
    for (const row of rows) {
      const { creator } = row.creatorLook;
      if (byCreator.has(creator.id)) continue;
      byCreator.set(creator.id, {
        creatorId: creator.id,
        name: creator.name,
        handle: creator.handle,
        heightCm: creator.showHeight ? creator.heightCm : null,
        sizeWorn: row.sizeWorn,
        lookId: row.creatorLook.id,
        lookImageUrl: row.creatorLook.imageUrl,
      });
      if (byCreator.size >= SEEN_ON_CREATORS_LIMIT) break;
    }
    return [...byCreator.values()];
  },

  async updateWornByCount(productId: string, wornByCount: number): Promise<void> {
    await prisma.product.update({ where: { id: productId }, data: { wornByCount } });
  },

  async refreshRatingSummary(productId: string): Promise<void> {
    const grouped = await prisma.productReview.groupBy({
      by: ["rating"],
      where: { productId, deletedAt: null },
      _count: { _all: true },
    });

    const ratingCounts: Record<RatingCountField, number> = {
      rating1Count: 0,
      rating2Count: 0,
      rating3Count: 0,
      rating4Count: 0,
      rating5Count: 0,
    };
    let reviewCount = 0;
    let weightedSum = 0;
    for (const {
      rating,
      _count: { _all: count },
    } of grouped) {
      if (rating < PRODUCT_RATING_MIN || rating > PRODUCT_RATING_MAX) continue;
      const field = RATING_COUNT_FIELD_BY_VALUE[rating];
      if (!field) continue;
      ratingCounts[field] = count;
      reviewCount += count;
      weightedSum += rating * count;
    }

    await prisma.product.update({
      where: { id: productId },
      data: {
        ...ratingCounts,
        reviewCount,
        avgRating: reviewCount > 0 ? weightedSum / reviewCount : null,
      },
    });
  },

  async listProductIdsTaggedByCreator(creatorId: string): Promise<string[]> {
    const rows = await prisma.creatorLookProduct.findMany({
      where: { reviewStatus: TagReviewStatus.APPROVED, creatorLook: { creatorId } },
      select: { productId: true },
      distinct: ["productId"],
    });
    return rows.map((row) => row.productId);
  },
};
