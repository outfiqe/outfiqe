import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";

export type EngagementAffinity = {
  engagedCreatorIds: Set<string>;
  hashtagWeights: Map<string, number>;
};

export const computeViewerEngagementAffinity = async (
  viewerId: string,
  lookbackDays: number,
): Promise<EngagementAffinity> => {
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<{ creator_id: string; tag: string | null }[]>(Prisma.sql`
    SELECT cl.creator_id, h.tag
    FROM (
      SELECT creator_look_id FROM creator_look_likes
      WHERE user_id = ${viewerId} AND created_at >= ${since}
      UNION ALL
      SELECT creator_look_id FROM creator_look_saves
      WHERE user_id = ${viewerId} AND created_at >= ${since}
      UNION ALL
      SELECT creator_look_id FROM creator_look_comments
      WHERE user_id = ${viewerId} AND created_at >= ${since} AND deleted_at IS NULL
    ) engaged
    JOIN creator_looks cl ON cl.id = engaged.creator_look_id
    LEFT JOIN creator_look_hashtags h ON h.creator_look_id = engaged.creator_look_id
  `);

  const engagedCreatorIds = new Set<string>();
  const hashtagWeights = new Map<string, number>();
  for (const row of rows) {
    engagedCreatorIds.add(row.creator_id);
    if (row.tag) hashtagWeights.set(row.tag, (hashtagWeights.get(row.tag) ?? 0) + 1);
  }
  return { engagedCreatorIds, hashtagWeights };
};

export type HashtagAffinityCandidate = {
  creatorId: string;
  matchingPosts: number;
};

export const listCreatorsByHashtagAffinity = async (
  tags: string[],
  lookbackDays: number,
  limit: number,
): Promise<HashtagAffinityCandidate[]> => {
  if (tags.length === 0) return [];
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<{ creator_id: string; matching_posts: bigint }[]>(Prisma.sql`
    SELECT cl.creator_id, COUNT(*) AS matching_posts
    FROM creator_look_hashtags h
    JOIN creator_looks cl ON cl.id = h.creator_look_id
    WHERE h.tag IN (${Prisma.join(tags)})
      AND cl.deleted_at IS NULL
      AND cl.created_at >= ${since}
    GROUP BY cl.creator_id
    ORDER BY matching_posts DESC
    LIMIT ${limit}
  `);

  return rows.map((row) => ({
    creatorId: row.creator_id,
    matchingPosts: Number(row.matching_posts),
  }));
};
