import { prisma } from "#db/prisma.js";
import type { Prisma } from "#generated/prisma/client.js";
import { ProductStatus, TagReviewStatus } from "#generated/prisma/enums.js";
import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";
import type { ProductWithBrand } from "#modules/products/product.types.js";

import { creatorLookCommentRepository } from "./comments/comment.repository.js";
import { MAX_TAG_RE_REQUESTS } from "./creator-look.constants.js";
import type {
  AdminLookPage,
  CreateCreatorLookInput,
  CreatorLookEditDetail,
  CreatorLookSummary,
  CreatorLookUpdateOutcome,
  TaggedProductPage,
  UpdateCreatorLookInput,
} from "./creator-look.types.js";
import type { SimpleCursor } from "./creator-look.utils.js";
import { toEditDetail, toSummary } from "./creator-look.utils.js";
import { creatorLookEngagementRepository } from "./engagement/engagement.repository.js";
import { creatorLookFeedRepository } from "./feed/feed.repository.js";
import { creatorLookTagReviewRepository } from "./tag-review/tag-review.repository.js";
import { creatorLookHashtagTrendingRepository } from "./trending/hashtag-trending.repository.js";
import { creatorLookPostTrendingRepository } from "./trending/post-trending.repository.js";

const taggedProductsInclude = {
  taggedProducts: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
} as const;

const editDetailInclude = {
  images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
  taggedProducts: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          imageUrl: true,
          brand: { select: { name: true } },
        },
      },
    },
  },
} as const;

export const creatorLookRepository = {
  async findSummaryById(lookId: string): Promise<CreatorLookSummary | null> {
    const look = await prisma.creatorLook.findFirst({
      where: { id: lookId, deletedAt: null },
      include: taggedProductsInclude,
    });
    return look ? toSummary(look) : null;
  },

  async create({
    creatorId,
    outfitSource,
    imageUrls,
    imageAssetIds,
    caption,
    layout,
    taggedProducts,
    hashtags,
  }: CreateCreatorLookInput): Promise<CreatorLookSummary> {
    const look = await prisma.$transaction(async (tx) => {
      const created = await tx.creatorLook.create({
        data: {
          creatorId,
          sourceOutfitId: outfitSource?.outfitId,
          sourceOutfitVersion: outfitSource?.outfitVersion,
          imageUrl: imageUrls[0],
          layout,
          caption,
          images: {
            create: imageUrls.map((url, sortOrder) => ({
              url,
              sortOrder,
              imageAssetId: imageAssetIds?.[sortOrder] ?? null,
            })),
          },
          taggedProducts: {
            create: taggedProducts.map(({ productId, sizeWorn, reviewStatus, approvalSource }) => ({
              productId,
              sizeWorn,
              reviewStatus,
              approvalSource,
            })),
          },
        },
        include: taggedProductsInclude,
      });

      if (hashtags.length > 0) {
        await tx.creatorLookHashtag.createMany({
          data: hashtags.map((tag) => ({ creatorLookId: created.id, tag })),
        });
      }

      return created;
    });

    return toSummary(look);
  },

  async findOwnedById(lookId: string, creatorId: string): Promise<CreatorLookEditDetail | null> {
    const look = await prisma.creatorLook.findFirst({
      where: { id: lookId, creatorId, deletedAt: null },
      include: editDetailInclude,
    });
    return look ? toEditDetail(look) : null;
  },

  async update(
    lookId: string,
    {
      imageUrls,
      imageAssetIds,
      caption,
      taggedProducts,
      newTagStatuses,
      hashtags,
    }: UpdateCreatorLookInput,
  ): Promise<CreatorLookUpdateOutcome> {
    const now = new Date();

    const outcome = await prisma.$transaction(async (tx) => {
      const existingTags = await tx.creatorLookProduct.findMany({
        where: { creatorLookId: lookId },
        select: { productId: true, sizeWorn: true, reviewStatus: true, reRequestCount: true },
      });
      const existingByProductId = new Map(existingTags.map((tag) => [tag.productId, tag]));
      const incomingProductIds = new Set(taggedProducts.map((tag) => tag.productId));

      const removedProductIds = existingTags
        .filter((tag) => !incomingProductIds.has(tag.productId))
        .map((tag) => tag.productId);
      if (removedProductIds.length > 0) {
        await tx.creatorLookProduct.deleteMany({
          where: { creatorLookId: lookId, productId: { in: removedProductIds } },
        });
      }

      const newlyApprovedProductIds: string[] = [];
      const submittedProductIds: string[] = [];

      for (const tag of taggedProducts) {
        const current = existingByProductId.get(tag.productId);

        if (!current) {
          const resolved = newTagStatuses.get(tag.productId);
          if (!resolved) continue;
          await tx.creatorLookProduct.create({
            data: {
              creatorLookId: lookId,
              productId: tag.productId,
              sizeWorn: tag.sizeWorn,
              reviewStatus: resolved.reviewStatus,
              approvalSource: resolved.approvalSource,
              submittedAt: now,
            },
          });
          if (resolved.reviewStatus === TagReviewStatus.APPROVED) {
            newlyApprovedProductIds.push(tag.productId);
          } else {
            submittedProductIds.push(tag.productId);
          }
          continue;
        }

        const sizeChanged = current.sizeWorn !== tag.sizeWorn;
        const shouldReRequest =
          current.reviewStatus === TagReviewStatus.REJECTED &&
          current.reRequestCount < MAX_TAG_RE_REQUESTS;

        if (!sizeChanged && !shouldReRequest) continue;

        const data: Prisma.CreatorLookProductUncheckedUpdateInput = {};
        if (sizeChanged) data.sizeWorn = tag.sizeWorn;
        if (shouldReRequest) {
          data.reviewStatus = TagReviewStatus.PENDING;
          data.approvalSource = null;
          data.reviewedAt = null;
          data.reviewedById = null;
          data.rejectionReason = null;
          data.rejectionNote = null;
          data.reRequestCount = { increment: 1 };
          data.submittedAt = now;
          submittedProductIds.push(tag.productId);
        }

        await tx.creatorLookProduct.update({
          where: { creatorLookId_productId: { creatorLookId: lookId, productId: tag.productId } },
          data,
        });
      }

      await tx.creatorLookHashtag.deleteMany({ where: { creatorLookId: lookId } });
      await tx.creatorLookImage.deleteMany({ where: { creatorLookId: lookId } });

      const updated = await tx.creatorLook.update({
        where: { id: lookId },
        data: {
          imageUrl: imageUrls[0],
          caption,
          images: {
            create: imageUrls.map((url, sortOrder) => ({
              url,
              sortOrder,
              imageAssetId: imageAssetIds?.[sortOrder] ?? null,
            })),
          },
        },
        include: taggedProductsInclude,
      });

      if (hashtags.length > 0) {
        await tx.creatorLookHashtag.createMany({
          data: hashtags.map((tag) => ({ creatorLookId: lookId, tag })),
        });
      }

      return { updated, newlyApprovedProductIds, submittedProductIds, removedProductIds };
    });

    return {
      summary: toSummary(outcome.updated),
      newlyApprovedProductIds: outcome.newlyApprovedProductIds,
      submittedProductIds: outcome.submittedProductIds,
      removedProductIds: outcome.removedProductIds,
    };
  },

  async softDelete(lookId: string): Promise<void> {
    await prisma.creatorLook.update({ where: { id: lookId }, data: { deletedAt: new Date() } });
  },

  async findActiveByIdForRemoval(
    lookId: string,
  ): Promise<{ creatorId: string; taggedProducts: { productId: string }[] } | null> {
    return prisma.creatorLook.findFirst({
      where: { id: lookId, deletedAt: null },
      select: {
        creatorId: true,
        taggedProducts: { select: { productId: true } },
      },
    });
  },

  async adminListLooks({
    q,
    cursor,
    limit,
  }: {
    q?: string;
    cursor?: string;
    limit: number;
  }): Promise<AdminLookPage> {
    const decoded = decodeCursor<SimpleCursor>(cursor);
    const cursorWhere: Prisma.CreatorLookWhereInput = decoded
      ? {
          OR: [
            { createdAt: { lt: new Date(decoded.c) } },
            { AND: [{ createdAt: new Date(decoded.c) }, { id: { lt: decoded.i } }] },
          ],
        }
      : {};
    const searchWhere: Prisma.CreatorLookWhereInput = q
      ? {
          OR: [
            { caption: { contains: q, mode: "insensitive" } },
            { creator: { handle: { contains: q, mode: "insensitive" } } },
            { creator: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {};

    const rows = await prisma.creatorLook.findMany({
      where: { AND: [{ deletedAt: null }, searchWhere, cursorWhere] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: {
        creator: { select: { id: true, name: true, handle: true, contentFlagCount: true } },
      },
    });

    const { items: pageRows, nextCursor } = buildCursorPage(rows, limit, (row) =>
      encodeCursor<SimpleCursor>({ c: row.createdAt.toISOString(), i: row.id }),
    );

    return {
      items: pageRows.map((row) => ({
        id: row.id,
        imageUrl: row.imageUrl,
        layout: row.layout,
        caption: row.caption,
        creator: row.creator,
        likeCount: row.likeCount,
        commentCount: row.commentCount,
        saveCount: row.saveCount,
        createdAt: row.createdAt,
      })),
      nextCursor,
    };
  },

  async countByCreatorId(creatorId: string): Promise<number> {
    return prisma.creatorLook.count({ where: { creatorId, deletedAt: null } });
  },

  async listTaggedProductsByCreatorId(
    creatorId: string,
    params: { cursor?: string; limit: number },
  ): Promise<TaggedProductPage<ProductWithBrand>> {
    const rows = await prisma.creatorLookProduct.findMany({
      where: {
        reviewStatus: TagReviewStatus.APPROVED,
        product: { status: ProductStatus.APPROVED },
        creatorLook: { creatorId, deletedAt: null },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      distinct: ["productId"],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        product: {
          include: {
            brand: { select: { name: true } },
            categories: { select: { slug: true, name: true } },
            productType: { select: { slug: true, label: true } },
          },
        },
      },
    });

    const { items: pageRows, nextCursor } = buildCursorPage(rows, params.limit, (row) => row.id);

    return { products: pageRows.map((row) => row.product), nextCursor };
  },

  async findActiveById(
    id: string,
  ): Promise<{ id: string; creatorId: string; likeCount: number } | null> {
    return prisma.creatorLook.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, creatorId: true, likeCount: true },
    });
  },

  ...creatorLookTagReviewRepository,

  ...creatorLookFeedRepository,

  ...creatorLookPostTrendingRepository,

  ...creatorLookHashtagTrendingRepository,

  ...creatorLookCommentRepository,

  ...creatorLookEngagementRepository,
};
