import type { LeaderboardCategory } from "#constants/leaderboard.constants.js";
import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";

import { LEADERBOARD_KEY_RETENTION_SECONDS } from "./leaderboard.constants.js";
import type { BrandPurchaseTotal, ZsetMember } from "./leaderboard.types.js";

const toZsetMembers = (raw: string[]): ZsetMember[] => {
  const entries: ZsetMember[] = [];
  for (let i = 0; i + 1 < raw.length; i += 2) {
    const member = raw[i];
    const scoreRaw = raw[i + 1];
    if (member === undefined || scoreRaw === undefined) continue;
    entries.push({ member, score: Number(scoreRaw) });
  }
  return entries;
};

export const leaderboardRepository = {
  async replaceWeeklyScores(
    category: LeaderboardCategory,
    week: string,
    entries: ZsetMember[],
  ): Promise<void> {
    const key = redisKeys.leaderboard(category, week);
    await redis.del(key);
    if (entries.length === 0) return;

    const args = entries.flatMap(({ member, score }) => [score, member]);
    await redis.zadd(key, ...args);
    await redis.expire(key, LEADERBOARD_KEY_RETENTION_SECONDS);
  },

  async incrementScore(
    category: LeaderboardCategory,
    week: string,
    brandId: string,
    delta: number,
  ): Promise<number> {
    const key = redisKeys.leaderboard(category, week);
    const score = await redis.zincrby(key, delta, brandId);
    await redis.expire(key, LEADERBOARD_KEY_RETENTION_SECONDS);
    return Number(score);
  },

  async topN(category: LeaderboardCategory, week: string, count: number): Promise<ZsetMember[]> {
    const key = redisKeys.leaderboard(category, week);
    const raw = await redis.zrevrange(key, 0, count - 1, "WITHSCORES");
    return toZsetMembers(raw);
  },

  async allScores(category: LeaderboardCategory, week: string): Promise<ZsetMember[]> {
    const key = redisKeys.leaderboard(category, week);
    const raw = await redis.zrange(key, "0", "-1", "WITHSCORES");
    return toZsetMembers(raw);
  },

  async rankOf(
    category: LeaderboardCategory,
    week: string,
    brandId: string,
  ): Promise<number | null> {
    const key = redisKeys.leaderboard(category, week);
    return redis.zrevrank(key, brandId);
  },

  async sumPurchaseUnitsByBrand(weekStart: Date): Promise<BrandPurchaseTotal[]> {
    const rows = await prisma.$queryRaw<{ brand_id: string; total_units: bigint }[]>(Prisma.sql`
      SELECT p.brand_id, SUM(oi.qty) AS total_units
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE oi.created_at >= ${weekStart}
        AND o.fulfilment_status != 'CANCELLED'
        AND o.payment_status IN ('PAID', 'DUE')
      GROUP BY p.brand_id
    `);
    return rows.map((row) => ({ brandId: row.brand_id, totalUnits: Number(row.total_units) }));
  },
};
