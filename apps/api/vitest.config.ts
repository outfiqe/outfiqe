import path from "node:path";

import { config as loadEnvFile } from "dotenv";
import { defineConfig } from "vitest/config";

const parsedTestEnv =
  loadEnvFile({ path: path.resolve(import.meta.dirname, ".env.test") }).parsed ?? {};
const testDatabaseUrl = parsedTestEnv.TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL;

const definedProcessEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: [
        "src/shared/utils/pagination.utils.ts",
        "src/shared/utils/opaque-token.utils.ts",
        "src/modules/brand-applications/**",
        "src/modules/creators/**",
        "src/modules/creator-looks/**",
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
          },
          setupFiles: ["./src/testing/integration/setup.ts"],
          testTimeout: 15000,
          hookTimeout: 30000,
          pool: "forks",
          maxWorkers: 1,
        },
      },
    ],
  },
});
