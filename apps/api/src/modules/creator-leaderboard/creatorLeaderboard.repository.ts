import { prisma } from "#db/prisma.js";
import type { CreatorLeaderboardCategory } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";

import { CREATOR_LEADERBOARD_KEY_RETENTION_SECONDS } from "./creatorLeaderboard.constants.js";
import type {
  CreatorLeaderboardCategoryState,
  CreatorStatsRow,
  ZsetMember,
} from "./creatorLeaderboard.types.js";
import { toZsetMembers } from "./creatorLeaderboard.utils.js";

export const creatorLeaderboardRepository = {
  async replaceWeeklyScores(
    category: CreatorLeaderboardCategory,
    week: string,
    entries: ZsetMember[],
  ): Promise<void> {
    const key = redisKeys.creatorLeaderboard(category, week);
    await redis.del(key);
    if (entries.length === 0) return;

    const args = entries.flatMap(({ member, score }) => [score, member]);
    await redis.zadd(key, ...args);
    await redis.expire(key, CREATOR_LEADERBOARD_KEY_RETENTION_SECONDS);
  },

  async topN(
    category: CreatorLeaderboardCategory,
    week: string,
    count: number,
  ): Promise<ZsetMember[]> {
    const key = redisKeys.creatorLeaderboard(category, week);
    const raw = await redis.zrevrange(key, 0, count - 1, "WITHSCORES");
    return toZsetMembers(raw);
  },

  async allScores(category: CreatorLeaderboardCategory, week: string): Promise<ZsetMember[]> {
    const key = redisKeys.creatorLeaderboard(category, week);
    const raw = await redis.zrange(key, "0", "-1", "WITHSCORES");
    return toZsetMembers(raw);
  },

  async rankOf(
    category: CreatorLeaderboardCategory,
    week: string,
    creatorId: string,
  ): Promise<number | null> {
    const key = redisKeys.creatorLeaderboard(category, week);
    return redis.zrevrank(key, creatorId);
  },

  async fetchCreatorStats(): Promise<CreatorStatsRow[]> {
    const rows = await prisma.$queryRaw<
      {
        creator_id: string;
        total_xp: bigint;
        follower_count: number;
        total_likes: bigint;
        total_engagement: bigint;
        total_sales: bigint;
        achievement_count: bigint;
      }[]
    >`
      SELECT
        u.id AS creator_id,
        COALESCE(up.total_xp, 0) AS total_xp,
        u.follower_count AS follower_count,
        COALESCE(look_stats.total_likes, 0) AS total_likes,
        COALESCE(look_stats.total_engagement, 0) AS total_engagement,
        COALESCE(sales_stats.total_sales, 0) AS total_sales,
        COALESCE(badge_stats.achievement_count, 0) AS achievement_count
      FROM users u
      LEFT JOIN user_progress up ON up.user_id = u.id
      LEFT JOIN (
        SELECT
          creator_id,
          SUM(like_count) AS total_likes,
          SUM(like_count + comment_count + save_count + view_count) AS total_engagement
        FROM creator_looks
        WHERE deleted_at IS NULL
        GROUP BY creator_id
      ) look_stats ON look_stats.creator_id = u.id
      LEFT JOIN (
        SELECT creator_id, SUM(amount) AS total_sales
        FROM creator_commissions
        WHERE status != 'VOIDED'
        GROUP BY creator_id
      ) sales_stats ON sales_stats.creator_id = u.id
      LEFT JOIN (
        SELECT user_id, COUNT(*) AS achievement_count
        FROM user_badges
        WHERE removed_at IS NULL
        GROUP BY user_id
      ) badge_stats ON badge_stats.user_id = u.id
      WHERE u.is_creator = true
        AND u.creator_status = 'APPROVED'
        AND u.hide_from_leaderboards = false
    `;

    return rows.map((row) => ({
      creatorId: row.creator_id,
      totalXp: Number(row.total_xp),
      followerCount: row.follower_count,
      totalLikes: Number(row.total_likes),
      totalEngagement: Number(row.total_engagement),
      totalSales: Number(row.total_sales),
      achievementCount: Number(row.achievement_count),
    }));
  },

  async listCategoryConfigs(): Promise<CreatorLeaderboardCategoryState[]> {
    return prisma.creatorLeaderboardCategoryConfig.findMany({
      select: { category: true, enabled: true },
      orderBy: { category: "asc" },
    });
  },

  async isCategoryEnabled(category: CreatorLeaderboardCategory): Promise<boolean> {
    const config = await prisma.creatorLeaderboardCategoryConfig.findUnique({
      where: { category },
      select: { enabled: true },
    });
    return config?.enabled ?? true;
  },

  async setCategoryEnabled(
    category: CreatorLeaderboardCategory,
    enabled: boolean,
  ): Promise<CreatorLeaderboardCategoryState> {
    return prisma.creatorLeaderboardCategoryConfig.upsert({
      where: { category },
      create: { category, enabled },
      update: { enabled },
      select: { category: true, enabled: true },
    });
  },
};
