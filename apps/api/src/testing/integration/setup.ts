import { afterAll, afterEach } from "vitest";

import { prisma } from "#db/prisma.js";
import { disconnectRedis, redis } from "#redis/redis.client.js";

afterEach(async () => {
  await resetDatabase();
  await resetEphemeralRedisState();
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

const EPHEMERAL_REDIS_KEY_PATTERNS = [
  "ratelimit:*",
  "auth:login-lockout:*",
  "platform:nav-access:*",
];

const resetEphemeralRedisState = async (): Promise<void> => {
  const keysPerPattern = await Promise.all(
    EPHEMERAL_REDIS_KEY_PATTERNS.map((pattern) => redis.keys(pattern)),
  );
  const keys = keysPerPattern.flat();
  if (keys.length === 0) return;

  await redis.del(...keys);
};
