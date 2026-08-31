import path from "node:path";

import { config as loadEnvFile } from "dotenv";
import { defineConfig } from "vitest/config";

import { INTEGRATION_WORKER_COUNT } from "./src/testing/integration/workerPool.js";

const parsedTestEnv =
  loadEnvFile({ path: path.resolve(import.meta.dirname, ".env.test") }).parsed ?? {};
const testDatabaseUrl = parsedTestEnv.TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL;

const SANDBOX_ENV_OVERRIDES_PREVENTING_REAL_EXTERNAL_SERVICE_CALLS_IN_TESTS = {
  GMAIL_APP_PASSWORD: "",
  ESEWA_SECRET_KEY: "8gBm/:&EnhH.1/q",
  KHALTI_SECRET_KEY: "KHALTI_TEST_SECRET_KEY_NOT_SET",
  PASSWORD_BREACH_CHECK_ENABLED: "false",
  CAPTCHA_ENABLED: "false",
  GOOGLE_CLIENT_ID: "GOOGLE_CLIENT_ID_NOT_SET",
  GOOGLE_CLIENT_SECRET: "GOOGLE_CLIENT_SECRET_NOT_SET",
  FACEBOOK_APP_ID: "FACEBOOK_APP_ID_NOT_SET",
  FACEBOOK_APP_SECRET: "FACEBOOK_APP_SECRET_NOT_SET",
};

const definedProcessEnv = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] =>
      entry[1] !== undefined &&
      !(entry[0] in SANDBOX_ENV_OVERRIDES_PREVENTING_REAL_EXTERNAL_SERVICE_CALLS_IN_TESTS),
  ),
);

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: [
        "src/app.ts",
        "src/config/app-env.ts",
        "src/processes/consumers.ts",
        "src/shared/utils/readiness.utils.ts",
        "src/testing/integration/workerPool.ts",
        "src/shared/utils/pagination.utils.ts",
        "src/shared/utils/password.utils.ts",
        "src/shared/utils/password-breach.utils.ts",
        "src/shared/utils/backoff.utils.ts",
        "src/shared/events/event-bus.utils.ts",
        "src/modules/auth/auth.retention.ts",
        "src/modules/auth/auth.lockout.utils.ts",
        "src/modules/auth/auth.captcha.utils.ts",
        "src/modules/auth/oauth/**/*.ts",
        "src/modules/users/user.service.ts",
        "src/shared/utils/opaque-token.utils.ts",
        "src/shared/utils/iso-week.utils.ts",
        "src/shared/utils/creator-engagement-affinity.utils.ts",
        "src/modules/brand-applications/**/*.ts",
        "src/modules/xp/xp.utils.ts",
        "src/modules/achievements/achievement.utils.ts",
        "src/modules/badges/badge.utils.ts",
        "src/modules/challenges/challenge.utils.ts",
        "src/modules/creator-leaderboard/creatorLeaderboard.utils.ts",
        "src/modules/creator-competitions/creatorCompetition.utils.ts",
        "src/modules/creators/**/*.ts",
        "src/modules/creator-looks/**/*.ts",
        "src/modules/product-reviews/**/*.ts",
        "src/modules/brands/**/*.ts",
        "src/modules/categories/**/*.ts",
        "src/modules/follows/**/*.ts",
        "src/modules/notifications/notification.utils.ts",
        "src/modules/notifications/notification.retention.ts",
        "src/modules/nepal-banks/**/*.ts",
        "src/modules/bank-accounts/**/*.ts",
        "src/shared/utils/account-number-encryption.utils.ts",
        "src/shared/utils/bank-account-body.schemas.ts",
        "src/shared/utils/name-mismatch.utils.ts",
        "src/modules/brand-bank-accounts/**/*.ts",
        "src/modules/brand-payouts/**/*.ts",
        "src/shared/utils/lifecycle-sweep.utils.ts",
        "src/modules/withdraw/**/*.ts",
        "src/shared/utils/prisma.utils.ts",
        "src/shared/utils/cors.utils.ts",
        "src/modules/financial-rollup/**/*.ts",
        "src/modules/image-processing/**/*.ts",
        "src/modules/chat/**/*.ts",
        "src/modules/crm-access/**/*.ts",
        "src/modules/crm-billing/**/*.ts",
        "src/modules/crm-relationships/**/*.ts",
        "src/modules/crm-pipeline/**/*.ts",
        "src/modules/crm-activities/**/*.ts",
        "src/modules/crm-tickets/**/*.ts",
        "src/modules/crm-reporting/**/*.ts",
        "src/modules/crm-audit/**/*.ts",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.integration.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts"],
          environment: "node",
          env: {
            ...definedProcessEnv,
            ...parsedTestEnv,
            ...(testDatabaseUrl ? { DATABASE_URL: testDatabaseUrl } : {}),
            ...SANDBOX_ENV_OVERRIDES_PREVENTING_REAL_EXTERNAL_SERVICE_CALLS_IN_TESTS,
          },
          setupFiles: [
            "./src/testing/integration/perWorkerEnv.ts",
            "./src/testing/integration/setup.ts",
          ],
          globalSetup: ["./src/testing/integration/globalSetup.ts"],
          testTimeout: 15000,
          hookTimeout: 30000,
          pool: "forks",
          fileParallelism: true,
          maxWorkers: INTEGRATION_WORKER_COUNT,
        },
      },
    ],
  },
});
