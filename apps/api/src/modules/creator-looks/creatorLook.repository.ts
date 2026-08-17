import { randomUUID } from "node:crypto";

import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import type { CreatorLookTagClickSource } from "#generated/prisma/enums.js";
import { CreatorStatus, ProductStatus } from "#generated/prisma/enums.js";
import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";
import logger from "#lib/winston.utils.js";
import type { ProductWithBrand } from "#modules/products/product.types.js";
import { cacheService } from "#redis/cache.service.js";
import { CACHE_TTL, redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import type {
  CommentPage,
  CommentRecord,
  CreateCreatorLookInput,
  CreatorLookEditDetail,
  CreatorLookFeedPost,
  CreatorLookSummary,
  FeedPage,
  TaggedProductPage,
  TrendingTag,
  UpdateCreatorLookInput,
} from "./creatorLook.types.js";
import type {
  FeaturedLookCursor,
  SimpleCursor,
  TrendingSnapshotCursor,
} from "./creatorLook.utils.js";
import { toEditDetail, toSummary } from "./creatorLook.utils.js";

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

const feedRelationsInclude = {
  creator: { select: { id: true, name: true, handle: true, creatorStatus: true } },
  images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
  taggedProducts: {
    include: {
      product: {
        include: {
          brand: { select: { name: true } },
          categories: { select: { slug: true, name: true } },
        },
      },
    },
  },
  hashtags: { select: { tag: true } },
} as const;

type LookWithFeedRelations = Prisma.CreatorLookGetPayload<{ include: typeof feedRelationsInclude }>;

const toFeedPost = (
  {
    id,
    creator,
    imageUrl,
    images,
    caption,
    likeCount,
    commentCount,
    saveCount,
    creatorId,
    taggedProducts,
    hashtags,
    createdAt,
  }: LookWithFeedRelations,
  viewer: { likedIds: Set<string>; savedIds: Set<string>; followingIds: Set<string> },
): CreatorLookFeedPost => ({
  id,
  creator: {
    id: creator.id,
    name: creator.name,
    handle: creator.handle,
    isApproved: creator.creatorStatus === CreatorStatus.APPROVED,
  },
  imageUrl,
  images: images.length > 0 ? images.map((image) => image.url) : [imageUrl],
  caption,
  likeCount,
  commentCount,
  saveCount,
  isLiked: viewer.likedIds.has(id),
  isSaved: viewer.savedIds.has(id),
  isFollowingCreator: viewer.followingIds.has(creatorId),
  taggedProducts: taggedProducts.map(({ product }) => ({
    id: product.id,
    name: product.name,
    brand: product.brand.name,
    price: product.price,
    imageUrl: product.imageUrl,
  })),
  hashtags: hashtags.map((hashtag) => hashtag.tag),
  createdAt,
});

const hydrateFeedPosts = async (
  orderedIds: string[],
  viewerId: string | undefined,
): Promise<CreatorLookFeedPost[]> => {
  if (orderedIds.length === 0) return [];

  const [looks, likedRows, savedRows] = await Promise.all([
    prisma.creatorLook.findMany({
      where: { id: { in: orderedIds } },
      include: feedRelationsInclude,
    }),
    viewerId
      ? prisma.creatorLookLike.findMany({
          where: { userId: viewerId, creatorLookId: { in: orderedIds } },
          select: { creatorLookId: true },
        })
      : [],
    viewerId
      ? prisma.creatorLookSave.findMany({
          where: { userId: viewerId, creatorLookId: { in: orderedIds } },
          select: { creatorLookId: true },
        })
      : [],
  ]);

  const creatorIds = [...new Set(looks.map((look) => look.creatorId))];
  const followingRows =
    viewerId && creatorIds.length > 0
      ? await prisma.follow.findMany({
          where: { followerId: viewerId, followingId: { in: creatorIds } },
          select: { followingId: true },
        })
      : [];

  const viewer = {
    likedIds: new Set(likedRows.map((row) => row.creatorLookId)),
    savedIds: new Set(savedRows.map((row) => row.creatorLookId)),
    followingIds: new Set(followingRows.map((row) => row.followingId)),
  };

  const byId = new Map(looks.map((look) => [look.id, look]));
  return orderedIds
    .map((id) => byId.get(id))
    .filter((look): look is LookWithFeedRelations => Boolean(look))
    .map((look) => toFeedPost(look, viewer));
};

const TRENDING_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

const trendingSnapshotKey = (sessionId: string) =>
  redisKeys.cache("explore-trending-snapshot", sessionId);

const refreshTrendingSnapshotTtl = async (key: string): Promise<void> => {
  try {
    await cacheService.touch(key, CACHE_TTL.EXPLORE_TRENDING_SNAPSHOT);
  } catch (error) {
    logger.warn(`Cache TTL refresh failed for "${key}": ${describeError(error)}`);
  }
};

const getTrendingSnapshot = async (sessionId: string): Promise<string[] | null> => {
  const key = trendingSnapshotKey(sessionId);

  try {
    const cached = await cacheService.get<string[]>(key);
    if (cached) await refreshTrendingSnapshotTtl(key);
    return cached;
  } catch (error) {
    logger.warn(`Cache read failed for "${key}": ${describeError(error)}`);
    return null;
  }
};

const cacheTrendingSnapshot = async (sessionId: string, ids: string[]): Promise<void> => {
  try {
    await cacheService.set(
      trendingSnapshotKey(sessionId),
      ids,
      CACHE_TTL.EXPLORE_TRENDING_SNAPSHOT,
    );
  } catch (error) {
    logger.warn(
      `Cache write failed for "${trendingSnapshotKey(sessionId)}": ${describeError(error)}`,
    );
  }
};

const buildTrendingSnapshot = async (): Promise<string[]> => {
  const since = new Date(Date.now() - TRENDING_WINDOW_MS);
  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT cl.id
    FROM creator_looks cl
    JOIN users u ON u.id = cl.creator_id
    WHERE cl.deleted_at IS NULL
      AND u.creator_status = 'APPROVED'
      AND cl.created_at >= ${since}
    ORDER BY (cl.like_count * 2 + cl.comment_count + cl.save_count) DESC, cl.created_at DESC, cl.id DESC
  `);
  return rows.map((row) => row.id);
};

const resolveTrendingSnapshotSource = async (
  decoded: TrendingSnapshotCursor | undefined,
): Promise<{ sessionId: string; offset: number; ids: string[] }> => {
  const cachedIds = decoded ? await getTrendingSnapshot(decoded.sessionId) : null;
  if (decoded && cachedIds) {
    return { sessionId: decoded.sessionId, offset: decoded.offset, ids: cachedIds };
  }

  const sessionId = randomUUID();
  const ids = await buildTrendingSnapshot();
  await cacheTrendingSnapshot(sessionId, ids);
  return { sessionId, offset: 0, ids };
};

const listTrendingIds = async ({
  cursor,
  limit,
}: {
  cursor?: string;
  limit: number;
}): Promise<{ ids: string[]; nextCursor: string | null }> => {
  const decoded = decodeCursor<TrendingSnapshotCursor>(cursor);
  const { sessionId, offset, ids } = await resolveTrendingSnapshotSource(decoded);

  const pageIds = ids.slice(offset, offset + limit);
  const nextOffset = offset + pageIds.length;
  const nextCursor =
    nextOffset < ids.length
      ? encodeCursor<TrendingSnapshotCursor>({ sessionId, offset: nextOffset })
      : null;

  return { ids: pageIds, nextCursor };
};

const listIdsByFilter = async (
  where: Prisma.CreatorLookWhereInput,
  { cursor, limit }: { cursor?: string; limit: number },
): Promise<{ ids: string[]; nextCursor: string | null }> => {
  const decoded = decodeCursor<SimpleCursor>(cursor);
  const cursorWhere: Prisma.CreatorLookWhereInput = decoded
    ? {
        OR: [
          { createdAt: { lt: new Date(decoded.c) } },
          { AND: [{ createdAt: new Date(decoded.c) }, { id: { lt: decoded.i } }] },
        ],
      }
    : {};

  const rows = await prisma.creatorLook.findMany({
    where: { ...where, deletedAt: null, ...cursorWhere },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    select: { id: true, createdAt: true },
  });

  const { items: pageRows, nextCursor } = buildCursorPage(rows, limit, (row) =>
    encodeCursor<SimpleCursor>({ c: row.createdAt.toISOString(), i: row.id }),
  );

  return { ids: pageRows.map((row) => row.id), nextCursor };
};

const listSavedIds = async (
  userId: string,
  { cursor, limit }: { cursor?: string; limit: number },
): Promise<{ ids: string[]; nextCursor: string | null }> => {
  const decoded = decodeCursor<SimpleCursor>(cursor);
  const cursorWhere: Prisma.CreatorLookSaveWhereInput = decoded
    ? {
        OR: [
          { createdAt: { lt: new Date(decoded.c) } },
          { AND: [{ createdAt: new Date(decoded.c) }, { creatorLookId: { lt: decoded.i } }] },
        ],
      }
    : {};

  const rows = await prisma.creatorLookSave.findMany({
    where: { userId, creatorLook: { deletedAt: null }, ...cursorWhere },
    orderBy: [{ createdAt: "desc" }, { creatorLookId: "desc" }],
    take: limit + 1,
    select: { createdAt: true, creatorLookId: true },
  });

  const { items: pageRows, nextCursor } = buildCursorPage(rows, limit, (row) =>
    encodeCursor<SimpleCursor>({ c: row.createdAt.toISOString(), i: row.creatorLookId }),
  );

  return { ids: pageRows.map((row) => row.creatorLookId), nextCursor };
};

const listFeaturedLookIds = async ({
  cursor,
  limit,
}: {
  cursor?: string;
  limit: number;
}): Promise<{ ids: string[]; nextCursor: string | null }> => {
  const decoded = decodeCursor<FeaturedLookCursor>(cursor);
  const cursorFilter = decoded
    ? Prisma.sql`AND (
        featured.engagement < ${decoded.e}
        OR (featured.engagement = ${decoded.e} AND featured.look_id < ${decoded.i})
      )`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<{ look_id: string; engagement: number }[]>(Prisma.sql`
    SELECT featured.look_id, featured.engagement
    FROM (
      SELECT DISTINCT ON (clp.product_id)
        cl.id AS look_id,
        (cl.like_count * 2 + cl.comment_count + cl.save_count) AS engagement
      FROM creator_look_products clp
      JOIN creator_looks cl ON cl.id = clp.creator_look_id
      JOIN products p ON p.id = clp.product_id
      JOIN users u ON u.id = cl.creator_id
      WHERE cl.deleted_at IS NULL
        AND p.status = 'APPROVED'
        AND p.deleted_at IS NULL
        AND u.creator_status = 'APPROVED'
      ORDER BY clp.product_id, engagement DESC, cl.id DESC
    ) featured
    WHERE TRUE ${cursorFilter}
    GROUP BY featured.look_id, featured.engagement
    ORDER BY featured.engagement DESC, featured.look_id DESC
    LIMIT ${limit + 1}
  `);

  const { items: pageRows, nextCursor } = buildCursorPage(rows, limit, (row) =>
    encodeCursor<FeaturedLookCursor>({ e: row.engagement, i: row.look_id }),
  );

  return { ids: pageRows.map((row) => row.look_id), nextCursor };
};

const TRENDING_TAGS_LIMIT = 15;
const TRENDING_TAGS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const TRENDING_TAGS_CACHE_KEY = redisKeys.cache("creator-looks", "trending-tags");

/*
Cache-aside: trending tags are a rolling 7-day aggregate recomputed on read,
not tied to any single write, so a lazy GET/SETEX fits better than
write-through here. Redis failures fall open to a live recompute.
*/
const fetchTrendingTags = async (): Promise<TrendingTag[]> => {
  try {
    const cached = await cacheService.get<TrendingTag[]>(TRENDING_TAGS_CACHE_KEY);
    if (cached) return cached;
  } catch (error) {
    logger.warn(`Cache read failed for "${TRENDING_TAGS_CACHE_KEY}": ${describeError(error)}`);
  }

  const since = new Date(Date.now() - TRENDING_TAGS_WINDOW_MS);
  const rows = await prisma.$queryRaw<{ tag: string; post_count: bigint }[]>(Prisma.sql`
    SELECT h.tag, COUNT(*)::bigint AS post_count
    FROM creator_look_hashtags h
    JOIN creator_looks cl ON cl.id = h.creator_look_id
    WHERE cl.deleted_at IS NULL AND cl.created_at >= ${since}
    GROUP BY h.tag
    ORDER BY post_count DESC
    LIMIT ${TRENDING_TAGS_LIMIT}
  `);

  const trendingTags = rows.map((row) => ({ tag: row.tag, postCount: Number(row.post_count) }));

  try {
    await cacheService.set(TRENDING_TAGS_CACHE_KEY, trendingTags, CACHE_TTL.TRENDING_TAGS);
  } catch (error) {
    logger.warn(`Cache write failed for "${TRENDING_TAGS_CACHE_KEY}": ${describeError(error)}`);
  }

  return trendingTags;
};

export const creatorLookRepository = {
  async create({
    creatorId,
    imageUrls,
    caption,
    taggedProducts,
    hashtags,
  }: CreateCreatorLookInput): Promise<CreatorLookSummary> {
    const look = await prisma.$transaction(async (tx) => {
      const created = await tx.creatorLook.create({
        data: {
          creatorId,
          imageUrl: imageUrls[0],
          caption,
          images: {
            create: imageUrls.map((url, sortOrder) => ({ url, sortOrder })),
          },
          taggedProducts: {
            create: taggedProducts.map(({ productId, sizeWorn }) => ({
              productId,
              sizeWorn,
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
    { imageUrls, caption, taggedProducts, hashtags }: UpdateCreatorLookInput,
  ): Promise<CreatorLookSummary> {
    const look = await prisma.$transaction(async (tx) => {
      await tx.creatorLookProduct.deleteMany({ where: { creatorLookId: lookId } });
      await tx.creatorLookHashtag.deleteMany({ where: { creatorLookId: lookId } });
      await tx.creatorLookImage.deleteMany({ where: { creatorLookId: lookId } });

      const updated = await tx.creatorLook.update({
        where: { id: lookId },
        data: {
          imageUrl: imageUrls[0],
          caption,
          images: {
            create: imageUrls.map((url, sortOrder) => ({ url, sortOrder })),
          },
          taggedProducts: {
            create: taggedProducts.map(({ productId, sizeWorn }) => ({ productId, sizeWorn })),
          },
        },
        include: taggedProductsInclude,
      });

      if (hashtags.length > 0) {
        await tx.creatorLookHashtag.createMany({
          data: hashtags.map((tag) => ({ creatorLookId: lookId, tag })),
        });
      }

      return updated;
    });

    return toSummary(look);
  },

  async softDelete(lookId: string): Promise<void> {
    await prisma.creatorLook.update({ where: { id: lookId }, data: { deletedAt: new Date() } });
  },

  async listFeaturedLooks(params: { cursor?: string; limit: number }): Promise<FeedPage> {
    const listed = await listFeaturedLookIds(params);
    const posts = await hydrateFeedPosts(listed.ids, undefined);
    return { posts, nextCursor: listed.nextCursor };
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
          },
        },
      },
    });

    const { items: pageRows, nextCursor } = buildCursorPage(rows, params.limit, (row) => row.id);

    return { products: pageRows.map((row) => row.product), nextCursor };
  },

  async findActiveById(id: string): Promise<{ id: string; likeCount: number } | null> {
    return prisma.creatorLook.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, likeCount: true },
    });
  },

  async feed({
    tab,
    cursor,
    limit,
    viewerId,
    followingCreatorIds,
  }: {
    tab: string;
    cursor?: string;
    limit: number;
    viewerId?: string;
    followingCreatorIds: string[];
  }): Promise<FeedPage> {
    let listed: { ids: string[]; nextCursor: string | null };

    if (tab === "following") {
      listed = await listIdsByFilter({ creatorId: { in: followingCreatorIds } }, { cursor, limit });
    } else if (tab === "trending" || tab === "for_you") {
      listed = await listTrendingIds({ cursor, limit });
    } else {
      const tag = tab.replace(/^#/, "").toLowerCase();
      listed = await listIdsByFilter({ hashtags: { some: { tag } } }, { cursor, limit });
    }

    const posts = await hydrateFeedPosts(listed.ids, viewerId);
    return { posts, nextCursor: listed.nextCursor };
  },

  async countNewSince({
    tab,
    since,
    followingCreatorIds,
  }: {
    tab: string;
    since: Date;
    followingCreatorIds: string[];
  }): Promise<number> {
    const tabFilter: Prisma.CreatorLookWhereInput =
      tab === "following"
        ? { creatorId: { in: followingCreatorIds } }
        : tab === "trending" || tab === "for_you"
          ? { creator: { creatorStatus: CreatorStatus.APPROVED } }
          : { hashtags: { some: { tag: tab.replace(/^#/, "").toLowerCase() } } };

    return prisma.creatorLook.count({
      where: { ...tabFilter, deletedAt: null, createdAt: { gt: since } },
    });
  },

  async feedByCreatorId({
    creatorId,
    cursor,
    limit,
    viewerId,
  }: {
    creatorId: string;
    cursor?: string;
    limit: number;
    viewerId?: string;
  }): Promise<FeedPage> {
    const listed = await listIdsByFilter({ creatorId }, { cursor, limit });
    const posts = await hydrateFeedPosts(listed.ids, viewerId);
    return { posts, nextCursor: listed.nextCursor };
  },

  async listSaved(
    userId: string,
    { cursor, limit }: { cursor?: string; limit: number },
  ): Promise<FeedPage> {
    const listed = await listSavedIds(userId, { cursor, limit });
    const posts = await hydrateFeedPosts(listed.ids, userId);
    return { posts, nextCursor: listed.nextCursor };
  },

  async trendingTags(): Promise<TrendingTag[]> {
    return fetchTrendingTags();
  },

  async like(lookId: string, userId: string): Promise<{ likeCount: number }> {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.creatorLookLike.createMany({
        data: [{ creatorLookId: lookId, userId }],
        skipDuplicates: true,
      });

      const look =
        count > 0
          ? await tx.creatorLook.update({
              where: { id: lookId },
              data: { likeCount: { increment: 1 } },
            })
          : await tx.creatorLook.findUniqueOrThrow({ where: { id: lookId } });

      return { likeCount: look.likeCount };
    });
  },

  async unlike(lookId: string, userId: string): Promise<{ likeCount: number }> {
    return prisma.$transaction(async (tx) => {
      const deleted = await tx.creatorLookLike.deleteMany({
        where: { creatorLookId: lookId, userId },
      });
      if (deleted.count === 0) {
        const look = await tx.creatorLook.findUniqueOrThrow({ where: { id: lookId } });
        return { likeCount: look.likeCount };
      }
      const look = await tx.creatorLook.update({
        where: { id: lookId },
        data: { likeCount: { decrement: 1 } },
      });
      return { likeCount: look.likeCount };
    });
  },

  async save(lookId: string, userId: string): Promise<{ saveCount: number }> {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.creatorLookSave.createMany({
        data: [{ creatorLookId: lookId, userId }],
        skipDuplicates: true,
      });

      const look =
        count > 0
          ? await tx.creatorLook.update({
              where: { id: lookId },
              data: { saveCount: { increment: 1 } },
            })
          : await tx.creatorLook.findUniqueOrThrow({ where: { id: lookId } });

      return { saveCount: look.saveCount };
    });
  },

  async unsave(lookId: string, userId: string): Promise<{ saveCount: number }> {
    return prisma.$transaction(async (tx) => {
      const deleted = await tx.creatorLookSave.deleteMany({
        where: { creatorLookId: lookId, userId },
      });
      if (deleted.count === 0) {
        const look = await tx.creatorLook.findUniqueOrThrow({ where: { id: lookId } });
        return { saveCount: look.saveCount };
      }
      const look = await tx.creatorLook.update({
        where: { id: lookId },
        data: { saveCount: { decrement: 1 } },
      });
      return { saveCount: look.saveCount };
    });
  },

  async listComments(
    lookId: string,
    params: { cursor?: string; limit: number },
  ): Promise<CommentPage> {
    const decoded = decodeCursor<SimpleCursor>(params.cursor);
    const cursorWhere: Prisma.CreatorLookCommentWhereInput = decoded
      ? {
          OR: [
            { createdAt: { gt: new Date(decoded.c) } },
            { AND: [{ createdAt: new Date(decoded.c) }, { id: { gt: decoded.i } }] },
          ],
        }
      : {};

    const rows = await prisma.creatorLookComment.findMany({
      where: { creatorLookId: lookId, deletedAt: null, ...cursorWhere },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      take: params.limit + 1,
      include: { user: { select: { id: true, name: true, handle: true, avatarUrl: true } } },
    });

    const { items: pageRows, nextCursor } = buildCursorPage(rows, params.limit, (row) =>
      encodeCursor<SimpleCursor>({ c: row.createdAt.toISOString(), i: row.id }),
    );

    return {
      comments: pageRows.map((row): CommentRecord => ({
        id: row.id,
        userId: row.userId,
        userName: row.user.name,
        userHandle: row.user.handle,
        userAvatarUrl: row.user.avatarUrl,
        body: row.body,
        createdAt: row.createdAt,
      })),
      nextCursor,
    };
  },

  async createComment(lookId: string, userId: string, body: string): Promise<CommentRecord> {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.creatorLookComment.create({
        data: { creatorLookId: lookId, userId, body },
        include: { user: { select: { id: true, name: true, handle: true, avatarUrl: true } } },
      });
      await tx.creatorLook.update({
        where: { id: lookId },
        data: { commentCount: { increment: 1 } },
      });

      return {
        id: comment.id,
        userId: comment.userId,
        userName: comment.user.name,
        userHandle: comment.user.handle,
        userAvatarUrl: comment.user.avatarUrl,
        body: comment.body,
        createdAt: comment.createdAt,
      };
    });
  },

  async tagExists(lookId: string, productId: string): Promise<boolean> {
    const tag = await prisma.creatorLookProduct.findUnique({
      where: { creatorLookId_productId: { creatorLookId: lookId, productId } },
    });
    return Boolean(tag);
  },

  async recordTagClick(input: {
    lookId: string;
    productId: string;
    userId?: string;
    sessionId: string;
    source: CreatorLookTagClickSource;
  }): Promise<void> {
    await prisma.creatorLookTagClick.create({
      data: {
        creatorLookId: input.lookId,
        productId: input.productId,
        userId: input.userId,
        sessionId: input.sessionId,
        source: input.source,
      },
    });
  },
};
