import { execSync } from "node:child_process";

import { afterAll, afterEach, beforeAll } from "vitest";

import { prisma } from "#db/prisma.js";
import { disconnectRedis } from "#redis/redis.client.js";

beforeAll(() => {
  if (!process.env.TEST_DATABASE_URL) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Integration tests refuse to start without it, since " +
        "resetDatabase() below truncates every table after each test and vitest.config.ts " +
        "silently falls back to DATABASE_URL when TEST_DATABASE_URL is missing — copy " +
        "apps/api/.env.test.example to apps/api/.env.test and set it there.",
    );
  }
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
