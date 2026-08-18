import path from "node:path";

import { config as loadEnvFile } from "dotenv";
import { defineConfig } from "vitest/config";

const parsedTestEnv =
  loadEnvFile({ path: path.resolve(import.meta.dirname, ".env.test") }).parsed ?? {};
const testDatabaseUrl = parsedTestEnv.TEST_DATABASE_URL ?? process.env.TEST_DATABASE_URL;

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: [
        "src/shared/utils/pagination.utils.ts",
        "src/shared/utils/opaque-token.utils.ts",
        "src/modules/brand-applications/**",
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
          include: ["test/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["test/integration/**/*.test.ts"],
          environment: "node",
          env: {
            ...parsedTestEnv,
            ...(testDatabaseUrl ? { DATABASE_URL: testDatabaseUrl } : {}),
          },
          setupFiles: ["./test/integration/setup.ts"],
          testTimeout: 15000,
          hookTimeout: 30000,
          // All integration test files share one real Postgres database and
          // reset it (TRUNCATE) between tests — running files in parallel
          // would let one file's reset wipe another's in-flight fixtures.
          // Capping this project to a single worker keeps files sequential.
          pool: "forks",
          maxWorkers: 1,
        },
      },
    ],
  },
});
