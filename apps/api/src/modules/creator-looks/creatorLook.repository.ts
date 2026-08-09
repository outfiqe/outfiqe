import { prisma } from "../../shared/db/prisma.js";

import { CreatorStatus, ProductStatus } from "../../generated/prisma/enums.js";
import { Prisma } from "../../generated/prisma/client.js";
import type { CreatorLookTagClickSource } from "../../generated/prisma/enums.js";
import type { ProductWithBrand } from "../products/product.types.js";
import type {
  CommentPage,
  CommentRecord,
  CreateCreatorLookInput,
  CreatorLookFeedPost,
  CreatorLookSummary,
  FeedPage,
  TaggedProductPage,
  TrendingTag,
} from "./creatorLook.types.js";

const taggedProductsInclude = {
  taggedProducts: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
} as const;

const toSummary = (
  look: {
    id: string;
    creatorId: string;
    imageUrl: string;
    caption: string | null;
    createdAt: Date;
  } & {
    taggedProducts: { product: { id: string; name: string; imageUrl: string | null } }[];
  },
): CreatorLookSummary => ({
  id: look.id,
  creatorId: look.creatorId,
  imageUrl: look.imageUrl,
  caption: look.caption,
  createdAt: look.createdAt,
  taggedProducts: look.taggedProducts.map((tagged) => tagged.product),
});

// --- feed cursor codec ---------------------------------------------------
// Opaque, tab-shaped cursors. "Simple" tabs (following/hashtag) keyset on
// (createdAt, id); the trending/for_you tab keysets on (score, createdAt, id)
// since score is computed, not a column. Comment ids are random UUIDs (not
// sortable), so comment pagination reuses the "simple" shape too.
type SimpleCursor = { c: string; i: string };
type ScoredCursor = SimpleCursor & { s: number };

const encodeCursor = <T extends SimpleCursor>(obj: T): string =>
  Buffer.from(JSON.stringify(obj)).toString("base64url");

const decodeCursor = <T extends SimpleCursor>(cursor?: string): T | undefined => {
  if (!cursor) return undefined;
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as T;
  } catch {
    return undefined;
  }
};

const isUniqueConstraintError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

// --- feed hydration --------------------------------------------------------

const feedRelationsInclude = {
  creator: { select: { id: true, name: true, handle: true, creatorStatus: true } },
  taggedProducts: {
    include: { product: { include: { brand: { select: { name: true } } } } },
  },
  hashtags: { select: { tag: true } },
} as const;

type LookWithFeedRelations = Prisma.CreatorLookGetPayload<{ include: typeof feedRelationsInclude }>;

const toFeedPost = (
  look: LookWithFeedRelations,
  viewer: { likedIds: Set<string>; savedIds: Set<string>; followingIds: Set<string> },
): CreatorLookFeedPost => ({
  id: look.id,
  creator: {
    id: look.creator.id,
    name: look.creator.name,
    handle: look.creator.handle,
    isApproved: look.creator.creatorStatus === CreatorStatus.APPROVED,
  },
  imageUrl: look.imageUrl,
  caption: look.caption,
  likeCount: look.likeCount,
  commentCount: look.commentCount,
  saveCount: look.saveCount,
  isLiked: viewer.likedIds.has(look.id),
  isSaved: viewer.savedIds.has(look.id),
  isFollowingCreator: viewer.followingIds.has(look.creatorId),
  taggedProducts: look.taggedProducts.map((tagged) => ({
    id: tagged.product.id,
    name: tagged.product.name,
    brand: tagged.product.brand.name,
    price: tagged.product.price,
    imageUrl: tagged.product.imageUrl,
  })),
  hashtags: look.hashtags.map((hashtag) => hashtag.tag),
  createdAt: look.createdAt,
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

// --- feed id listings --------------------------------------------------------

const TRENDING_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

// trending/for_you: score isn't a column, so ordering + keyset pagination needs a raw query.
// Every other lookup here stays through the query builder — this is intentionally the one place
// that isn't.
const listTrendingIds = async (params: {
  cursor?: string;
  limit: number;
}): Promise<{ ids: string[]; nextCursor: string | null }> => {
  const decoded = decodeCursor<ScoredCursor>(params.cursor);
  const since = new Date(Date.now() - TRENDING_WINDOW_MS);
  const cursorClause = decoded
    ? Prisma.sql`AND (score, created_at, id) < (${decoded.s}, ${new Date(decoded.c)}, ${decoded.i}::uuid)`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<{ id: string; score: number; created_at: Date }[]>(Prisma.sql`
    WITH scored AS (
      SELECT cl.id, (cl.like_count * 2 + cl.comment_count + cl.save_count) AS score, cl.created_at
      FROM creator_looks cl
      JOIN users u ON u.id = cl.creator_id
      WHERE cl.deleted_at IS NULL
        AND u.creator_status = 'APPROVED'
        AND cl.created_at >= ${since}
    )
    SELECT id, score, created_at
    FROM scored
    WHERE TRUE ${cursorClause}
    ORDER BY score DESC, created_at DESC, id DESC
    LIMIT ${params.limit + 1}
  `);

  const hasMore = rows.length > params.limit;
  const page = hasMore ? rows.slice(0, params.limit) : rows;
  const last = page[page.length - 1];

  return {
    ids: page.map((row) => row.id),
    nextCursor:
      hasMore && last
        ? encodeCursor<ScoredCursor>({
            s: last.score,
            c: last.created_at.toISOString(),
            i: last.id,
          })
        : null,
  };
};

const listIdsByFilter = async (
  where: Prisma.CreatorLookWhereInput,
  params: { cursor?: string; limit: number },
): Promise<{ ids: string[]; nextCursor: string | null }> => {
  const decoded = decodeCursor<SimpleCursor>(params.cursor);
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
    take: params.limit + 1,
    select: { id: true, createdAt: true },
  });

  const hasMore = rows.length > params.limit;
  const page = hasMore ? rows.slice(0, params.limit) : rows;
  const last = page[page.length - 1];

  return {
    ids: page.map((row) => row.id),
    nextCursor:
      hasMore && last
        ? encodeCursor<SimpleCursor>({ c: last.createdAt.toISOString(), i: last.id })
        : null,
  };
};

// --- trending tags (in-memory cache) ---------------------------------------

const TRENDING_TAGS_LIMIT = 15;
const TRENDING_TAGS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const TRENDING_TAGS_TTL_MS = 10 * 60 * 1000;

// A Map + timestamp is enough at this scale. Swap this for a Redis GET/SETEX
// (same 10-minute TTL) here once this needs to be shared across instances.
let trendingTagsCache: { data: TrendingTag[]; expiresAt: number } | null = null;

const fetchTrendingTags = async (): Promise<TrendingTag[]> => {
  if (trendingTagsCache && trendingTagsCache.expiresAt > Date.now()) {
    return trendingTagsCache.data;
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

  const data = rows.map((row) => ({ tag: row.tag, postCount: Number(row.post_count) }));
  trendingTagsCache = { data, expiresAt: Date.now() + TRENDING_TAGS_TTL_MS };
  return data;
};

export const creatorLookRepository = {
  async create(input: CreateCreatorLookInput): Promise<CreatorLookSummary> {
    const look = await prisma.$transaction(async (tx) => {
      const created = await tx.creatorLook.create({
        data: {
          creatorId: input.creatorId,
          imageUrl: input.imageUrl,
          caption: input.caption,
          taggedProducts: {
            create: input.taggedProducts.map(({ productId, sizeWorn }) => ({
              productId,
              sizeWorn,
            })),
          },
        },
        include: taggedProductsInclude,
      });

      if (input.hashtags.length > 0) {
        await tx.creatorLookHashtag.createMany({
          data: input.hashtags.map((tag) => ({ creatorLookId: created.id, tag })),
        });
      }

      return created;
    });

    return toSummary(look);
  },

  async listByCreatorId(creatorId: string): Promise<CreatorLookSummary[]> {
    const looks = await prisma.creatorLook.findMany({
      where: { creatorId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: taggedProductsInclude,
    });

    return looks.map(toSummary);
  },

  async listPublicTaggedProducts(params: {
    cursor?: string;
    limit: number;
  }): Promise<TaggedProductPage<ProductWithBrand>> {
    const rows = await prisma.creatorLookProduct.findMany({
      where: { product: { status: ProductStatus.APPROVED } },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: { product: { include: { brand: { select: { name: true } } } } },
    });

    const hasMore = rows.length > params.limit;
    const page = hasMore ? rows.slice(0, params.limit) : rows;
    const lastRow = page[page.length - 1];

    return {
      products: page.map((row) => row.product),
      nextCursor: hasMore && lastRow ? lastRow.id : null,
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
        product: { status: ProductStatus.APPROVED },
        creatorLook: { creatorId, deletedAt: null },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: { product: { include: { brand: { select: { name: true } } } } },
    });

    const hasMore = rows.length > params.limit;
    const page = hasMore ? rows.slice(0, params.limit) : rows;
    const lastRow = page[page.length - 1];

    return {
      products: page.map((row) => row.product),
      nextCursor: hasMore && lastRow ? lastRow.id : null,
    };
  },

  async findActiveById(id: string): Promise<{ id: string; likeCount: number } | null> {
    return prisma.creatorLook.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, likeCount: true },
    });
  },

  async feed(params: {
    tab: string;
    cursor?: string;
    limit: number;
    viewerId?: string;
    followingCreatorIds: string[];
  }): Promise<FeedPage> {
    let listed: { ids: string[]; nextCursor: string | null };

    if (params.tab === "following") {
      listed = await listIdsByFilter(
        { creatorId: { in: params.followingCreatorIds } },
        { cursor: params.cursor, limit: params.limit },
      );
    } else if (params.tab === "trending" || params.tab === "for_you") {
      listed = await listTrendingIds({ cursor: params.cursor, limit: params.limit });
    } else {
      const tag = params.tab.replace(/^#/, "").toLowerCase();
      listed = await listIdsByFilter(
        { hashtags: { some: { tag } } },
        { cursor: params.cursor, limit: params.limit },
      );
    }

    const posts = await hydrateFeedPosts(listed.ids, params.viewerId);
    return { posts, nextCursor: listed.nextCursor };
  },

  async trendingTags(): Promise<TrendingTag[]> {
    return fetchTrendingTags();
  },

  async like(lookId: string, userId: string): Promise<{ likeCount: number }> {
    return prisma.$transaction(async (tx) => {
      try {
        await tx.creatorLookLike.create({ data: { creatorLookId: lookId, userId } });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
        const look = await tx.creatorLook.findUniqueOrThrow({ where: { id: lookId } });
        return { likeCount: look.likeCount };
      }
      const look = await tx.creatorLook.update({
        where: { id: lookId },
        data: { likeCount: { increment: 1 } },
      });
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
      try {
        await tx.creatorLookSave.create({ data: { creatorLookId: lookId, userId } });
      } catch (error) {
        if (!isUniqueConstraintError(error)) throw error;
        const look = await tx.creatorLook.findUniqueOrThrow({ where: { id: lookId } });
        return { saveCount: look.saveCount };
      }
      const look = await tx.creatorLook.update({
        where: { id: lookId },
        data: { saveCount: { increment: 1 } },
      });
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
      include: { user: { select: { id: true, name: true, handle: true } } },
    });

    const hasMore = rows.length > params.limit;
    const page = hasMore ? rows.slice(0, params.limit) : rows;
    const last = page[page.length - 1];

    return {
      comments: page.map((row): CommentRecord => ({
        id: row.id,
        userId: row.userId,
        userName: row.user.name,
        userHandle: row.user.handle,
        body: row.body,
        createdAt: row.createdAt,
      })),
      nextCursor:
        hasMore && last
          ? encodeCursor<SimpleCursor>({ c: last.createdAt.toISOString(), i: last.id })
          : null,
    };
  },

  async createComment(lookId: string, userId: string, body: string): Promise<CommentRecord> {
    return prisma.$transaction(async (tx) => {
      const comment = await tx.creatorLookComment.create({
        data: { creatorLookId: lookId, userId, body },
        include: { user: { select: { id: true, name: true, handle: true } } },
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
