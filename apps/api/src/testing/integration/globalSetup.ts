import { execSync } from "node:child_process";
import path from "node:path";

import { config as loadEnvFile } from "dotenv";

export default function setup(): void {
  const parsedTestEnv =
    loadEnvFile({ path: path.resolve(import.meta.dirname, "../../../.env.test") }).parsed ?? {};
  const testDatabaseUrl = parsedTestEnv.TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL;

  if (!testDatabaseUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Integration tests refuse to start without it, since " +
        "resetDatabase() truncates every table after each test and vitest.config.ts " +
        "silently falls back to DATABASE_URL when TEST_DATABASE_URL is missing — copy " +
        "apps/api/.env.test.example to apps/api/.env.test and set it there.",
    );
  }

  execSync("pnpm exec prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, ...parsedTestEnv, DATABASE_URL: testDatabaseUrl },
  });
}
