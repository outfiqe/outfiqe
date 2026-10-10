import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { CreatorStatus } from "#generated/prisma/enums.js";
import { buildCursorPage, decodeCursor, encodeCursor } from "#lib/pagination.utils.js";

import type { CreatorLookFeedPost, FeedPage, LookSearchPage } from "../creator-look.types.js";
import type { FeaturedLookCursor, SearchLooksCursor, SimpleCursor } from "../creator-look.utils.js";
import { hydrateFeedPosts } from "./feed-post-hydration.repository.js";
import { listForYouIds } from "./for-you-tab.repository.js";
import { listTrendingIds } from "./trending-tab.repository.js";

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
        AND clp.review_status = 'APPROVED'
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

export const creatorLookFeedRepository = {
  async listFeaturedLooks(params: { cursor?: string; limit: number }): Promise<FeedPage> {
    const listed = await listFeaturedLookIds(params);
    const posts = await hydrateFeedPosts(listed.ids, undefined);
    return { posts, nextCursor: listed.nextCursor };
  },

  async searchLooks(
    query: string,
    { cursor, limit }: { cursor?: string; limit: number },
    viewerId: string | undefined,
  ): Promise<LookSearchPage> {
    const offset = decodeCursor<SearchLooksCursor>(cursor)?.offset ?? 0;
    const rows = await prisma.$queryRaw<{ id: string; total_count: bigint }[]>(Prisma.sql`
      SELECT id, total_count FROM search_creator_looks(${query}, ${limit}, ${offset})
    `);

    const [first] = rows;
    const total = first ? Number(first.total_count) : 0;
    const ids = rows.map((row) => row.id);

    const posts = await hydrateFeedPosts(ids, viewerId);
    const nextOffset = offset + ids.length;
    const nextCursor =
      nextOffset < total ? encodeCursor<SearchLooksCursor>({ offset: nextOffset }) : null;

    return { posts, nextCursor, total };
  },

  async searchLookSuggestions(query: string, limit: number): Promise<CreatorLookFeedPost[]> {
    const rows = await prisma.$queryRaw<{ id: string; total_count: bigint }[]>(Prisma.sql`
      SELECT id, total_count FROM search_creator_looks(${query}, ${limit}, 0)
    `);
    return hydrateFeedPosts(
      rows.map((row) => row.id),
      undefined,
    );
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
    let listed: { ids: string[]; nextCursor: string | null; trendingIds?: Set<string> };

    if (tab === "following") {
      listed = await listIdsByFilter({ creatorId: { in: followingCreatorIds } }, { cursor, limit });
    } else if (tab === "trending") {
      listed = await listTrendingIds({ cursor, limit });
    } else if (tab === "for_you") {
      listed = await listForYouIds({
        cursor,
        limit,
        viewerId,
        followedCreatorIds: followingCreatorIds,
      });
    } else {
      const tag = tab.replace(/^#/, "").toLowerCase();
      listed = await listIdsByFilter({ hashtags: { some: { tag } } }, { cursor, limit });
    }

    const posts = await hydrateFeedPosts(listed.ids, viewerId, listed.trendingIds);
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

  async findPublicById(
    lookId: string,
    viewerId: string | undefined,
  ): Promise<CreatorLookFeedPost | null> {
    const [post] = await hydrateFeedPosts([lookId], viewerId);
    return post ?? null;
  },

  async listSaved(
    userId: string,
    { cursor, limit }: { cursor?: string; limit: number },
  ): Promise<FeedPage> {
    const listed = await listSavedIds(userId, { cursor, limit });
    const posts = await hydrateFeedPosts(listed.ids, userId);
    return { posts, nextCursor: listed.nextCursor };
  },
};
