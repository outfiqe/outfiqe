import { execSync } from "node:child_process";

import { afterAll, afterEach, beforeAll } from "vitest";

import { prisma } from "#db/prisma.js";
import { disconnectRedis } from "#redis/redis.client.js";

beforeAll(() => {
  execSync("pnpm exec prisma migrate deploy", { stdio: "inherit", env: process.env });
});

afterEach(async () => {
  await resetDatabase();
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
