import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { OutfitVisibility } from "#generated/prisma/enums.js";

const NO_STOCK = 0;
const ONE = 1;
const NO_ROWS = 0;

export type PublicBuildFilters = {
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  isInStockOnly: boolean;
  contributorId?: string;
  brandId?: string;
};

export type PublicFeedCursor = { madePublicAt: string; id: string };

export type PublicFeedRow = { id: string; madePublicAt: Date };

const commentAuthorSelect = {
  id: true,
  name: true,
  handle: true,
  avatarUrl: true,
} as const satisfies Prisma.UserSelect;

const commentInclude = {
  user: { select: commentAuthorSelect },
} as const satisfies Prisma.OutfitCommentInclude;

export type OutfitCommentRow = Prisma.OutfitCommentGetPayload<{ include: typeof commentInclude }>;

const optionalCondition = (isActive: boolean, condition: Prisma.Sql): Prisma.Sql =>
  isActive ? Prisma.sql`AND ${condition}` : Prisma.empty;

export const outfitSocialRepository = {
  async listPublicBuildIds(
    filters: PublicBuildFilters,
    cursor: PublicFeedCursor | undefined,
    take: number,
  ): Promise<PublicFeedRow[]> {
    const { categorySlug, minPrice, maxPrice, isInStockOnly, contributorId, brandId } = filters;
    return prisma.$queryRaw<PublicFeedRow[]>(Prisma.sql`
      SELECT o.id, o.made_public_at AS "madePublicAt"
      FROM outfits o
      JOIN outfit_snapshots s ON s.outfit_id = o.id AND s.version = o.published_version
      WHERE o.visibility::text = ${OutfitVisibility.PUBLIC}
        AND o.removed_at IS NULL
        AND o.made_public_at IS NOT NULL
        ${optionalCondition(minPrice !== undefined, Prisma.sql`s.total >= ${minPrice}`)}
        ${optionalCondition(maxPrice !== undefined, Prisma.sql`s.total <= ${maxPrice}`)}
        ${optionalCondition(
          contributorId !== undefined,
          Prisma.sql`${contributorId}::uuid = ANY(s.contributor_ids)`,
        )}
        ${optionalCondition(
          categorySlug !== undefined,
          Prisma.sql`EXISTS (
            SELECT 1
            FROM jsonb_to_recordset(s.items) AS item("productId" uuid)
            JOIN "_CategoryToProduct" product_category ON product_category."B" = item."productId"
            JOIN categories category ON category.id = product_category."A"
            WHERE category.slug = ${categorySlug}
          )`,
        )}
        ${optionalCondition(
          brandId !== undefined,
          Prisma.sql`EXISTS (
            SELECT 1
            FROM jsonb_to_recordset(s.items) AS item("productId" uuid)
            JOIN products product ON product.id = item."productId"
            WHERE product.brand_id = ${brandId}::uuid
          )`,
        )}
        ${optionalCondition(
          isInStockOnly,
          Prisma.sql`NOT EXISTS (
            SELECT 1
            FROM jsonb_to_recordset(s.items) AS item("productId" uuid)
            WHERE NOT EXISTS (
              SELECT 1 FROM product_sizes size
              WHERE size.product_id = item."productId" AND size.stock > ${NO_STOCK}
            )
          )`,
        )}
        ${optionalCondition(
          cursor !== undefined,
          Prisma.sql`(o.made_public_at, o.id) < (${cursor?.madePublicAt}::timestamp, ${cursor?.id}::uuid)`,
        )}
      ORDER BY o.made_public_at DESC, o.id DESC
      LIMIT ${take}
    `);
  },

  async loadPublicBuilds(outfitIds: string[]) {
    return prisma.outfit.findMany({
      where: { id: { in: outfitIds } },
      select: {
        id: true,
        title: true,
        visibility: true,
        publishedVersion: true,
        madePublicAt: true,
        removedAt: true,
        likeCount: true,
        saveCount: true,
        commentCount: true,
        snapshots: {
          select: {
            version: true,
            items: true,
            total: true,
            contributorIds: true,
            createdAt: true,
          },
        },
      },
    });
  },

  async listProductStock(productIds: string[]): Promise<Set<string>> {
    const inStockProducts = await prisma.product.findMany({
      where: { id: { in: productIds }, sizes: { some: { stock: { gt: NO_STOCK } } } },
      select: { id: true },
    });
    return new Set(inStockProducts.map(({ id }) => id));
  },

  async listViewerReactions(viewerId: string, outfitIds: string[]) {
    const [likes, saves] = await Promise.all([
      prisma.outfitLike.findMany({
        where: { userId: viewerId, outfitId: { in: outfitIds } },
        select: { outfitId: true },
      }),
      prisma.outfitSave.findMany({
        where: { userId: viewerId, outfitId: { in: outfitIds } },
        select: { outfitId: true },
      }),
    ]);
    return {
      likedOutfitIds: new Set(likes.map(({ outfitId }) => outfitId)),
      savedOutfitIds: new Set(saves.map(({ outfitId }) => outfitId)),
    };
  },

  async findSocialTarget(outfitId: string) {
    return prisma.outfit.findUnique({
      where: { id: outfitId },
      select: { id: true, title: true, visibility: true, removedAt: true, publishedVersion: true },
    });
  },

  async isShareRecipient(outfitId: string, userId: string): Promise<boolean> {
    const share = await prisma.outfitShare.findUnique({
      where: { outfitId_userId: { outfitId, userId } },
      select: { outfitId: true },
    });
    return share !== null;
  },

  async like(outfitId: string, userId: string): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const { count: insertedCount } = await tx.outfitLike.createMany({
        data: [{ outfitId, userId }],
        skipDuplicates: true,
      });
      const outfit =
        insertedCount === NO_ROWS
          ? await tx.outfit.findUniqueOrThrow({
              where: { id: outfitId },
              select: { likeCount: true },
            })
          : await tx.outfit.update({
              where: { id: outfitId },
              data: { likeCount: { increment: ONE } },
              select: { likeCount: true },
            });
      return outfit.likeCount;
    });
  },

  async unlike(outfitId: string, userId: string): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const { count: deletedCount } = await tx.outfitLike.deleteMany({
        where: { outfitId, userId },
      });
      const outfit =
        deletedCount === NO_ROWS
          ? await tx.outfit.findUniqueOrThrow({
              where: { id: outfitId },
              select: { likeCount: true },
            })
          : await tx.outfit.update({
              where: { id: outfitId },
              data: { likeCount: { decrement: ONE } },
              select: { likeCount: true },
            });
      return outfit.likeCount;
    });
  },

  async save(outfitId: string, userId: string): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const { count: insertedCount } = await tx.outfitSave.createMany({
        data: [{ outfitId, userId }],
        skipDuplicates: true,
      });
      const outfit =
        insertedCount === NO_ROWS
          ? await tx.outfit.findUniqueOrThrow({
              where: { id: outfitId },
              select: { saveCount: true },
            })
          : await tx.outfit.update({
              where: { id: outfitId },
              data: { saveCount: { increment: ONE } },
              select: { saveCount: true },
            });
      return outfit.saveCount;
    });
  },

  async unsave(outfitId: string, userId: string): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const { count: deletedCount } = await tx.outfitSave.deleteMany({
        where: { outfitId, userId },
      });
      const outfit =
        deletedCount === NO_ROWS
          ? await tx.outfit.findUniqueOrThrow({
              where: { id: outfitId },
              select: { saveCount: true },
            })
          : await tx.outfit.update({
              where: { id: outfitId },
              data: { saveCount: { decrement: ONE } },
              select: { saveCount: true },
            });
      return outfit.saveCount;
    });
  },

  async listSavedBuildIds(userId: string, cursor: string | undefined, take: number) {
    return prisma.outfitSave.findMany({
      where: {
        userId,
        outfit: { visibility: OutfitVisibility.PUBLIC, removedAt: null },
      },
      orderBy: [{ createdAt: "desc" }, { outfitId: "desc" }],
      take,
      ...(cursor ? { cursor: { outfitId_userId: { outfitId: cursor, userId } }, skip: ONE } : {}),
      select: { outfitId: true },
    });
  },

  async listTopLevelComments(outfitId: string, cursor: string | undefined, take: number) {
    return prisma.outfitComment.findMany({
      where: { outfitId, parentCommentId: null, deletedAt: null },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: ONE } : {}),
      include: commentInclude,
    });
  },

  async listReplies(parentCommentId: string, cursor: string | undefined, take: number) {
    return prisma.outfitComment.findMany({
      where: { parentCommentId, deletedAt: null },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take,
      ...(cursor ? { cursor: { id: cursor }, skip: ONE } : {}),
      include: commentInclude,
    });
  },

  async findComment(commentId: string) {
    return prisma.outfitComment.findFirst({
      where: { id: commentId, deletedAt: null },
      select: { id: true, outfitId: true, userId: true, parentCommentId: true },
    });
  },

  async createComment(input: {
    outfitId: string;
    userId: string;
    body: string;
    parentCommentId: string | null;
  }): Promise<OutfitCommentRow> {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.outfitComment.create({ data: input, include: commentInclude });
      await tx.outfit.update({
        where: { id: input.outfitId },
        data: { commentCount: { increment: ONE } },
      });
      if (input.parentCommentId) {
        await tx.outfitComment.update({
          where: { id: input.parentCommentId },
          data: { replyCount: { increment: ONE } },
        });
      }
      return comment;
    });
  },

  async softDeleteComment(commentId: string, deletedAt: Date): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
      const { count: deletedCount } = await tx.outfitComment.updateMany({
        where: { id: commentId, deletedAt: null },
        data: { deletedAt },
      });
      if (deletedCount === NO_ROWS) return false;

      const comment = await tx.outfitComment.findUniqueOrThrow({
        where: { id: commentId },
        select: { outfitId: true, parentCommentId: true },
      });
      const { count: hiddenReplyCount } = await tx.outfitComment.updateMany({
        where: { parentCommentId: commentId, deletedAt: null },
        data: { deletedAt },
      });
      await tx.outfit.update({
        where: { id: comment.outfitId },
        data: { commentCount: { decrement: ONE + hiddenReplyCount } },
      });
      if (comment.parentCommentId) {
        await tx.outfitComment.update({
          where: { id: comment.parentCommentId },
          data: { replyCount: { decrement: ONE } },
        });
      }
      return true;
    });
  },

  async markRemoved(outfitId: string, removedAt: Date): Promise<boolean> {
    const { count: removedCount } = await prisma.outfit.updateMany({
      where: { id: outfitId, removedAt: null },
      data: { removedAt },
    });
    return removedCount > NO_ROWS;
  },
};
