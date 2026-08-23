import { afterAll, afterEach } from "vitest";

import { prisma } from "#db/prisma.js";
import { disconnectRedis, redis } from "#redis/redis.client.js";

afterEach(async () => {
  await resetDatabase();
  await resetRateLimitCounters();
});

afterAll(async () => {
  await prisma.$disconnect();
  await disconnectRedis();
});

const resetDatabase = async (): Promise<void> => {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename != '_prisma_migrations'
  `;
  if (tables.length === 0) return;

  const quotedTableNames = tables.map(({ tablename }) => `"public"."${tablename}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTableNames} RESTART IDENTITY CASCADE;`);
};

const RATE_LIMIT_KEY_PATTERN = "ratelimit:*";

const resetRateLimitCounters = async (): Promise<void> => {
  const keys = await redis.keys(RATE_LIMIT_KEY_PATTERN);
  if (keys.length === 0) return;

  await redis.del(...keys);
};
