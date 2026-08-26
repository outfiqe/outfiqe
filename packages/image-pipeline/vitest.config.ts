import { defineConfig } from "vitest/config";

const TEST_TIMEOUT_MS = 15000;
const HOOK_TIMEOUT_MS = 30000;

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/*.integration.test.ts",
        "src/**/*.contract.ts",
        "src/testing/**",
        "src/index.ts",
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
            IMAGE_PIPELINE_TEST_REDIS_URL:
              process.env.IMAGE_PIPELINE_TEST_REDIS_URL ?? "redis://localhost:6379/15",
            IMAGE_QUEUE_MAX_ATTEMPTS: "2",
            IMAGE_QUEUE_BACKOFF_BASE_DELAY_MS: "50",
            IMAGE_QUEUE_BACKOFF_JITTER: "0",
          },
          testTimeout: TEST_TIMEOUT_MS,
          hookTimeout: HOOK_TIMEOUT_MS,
          pool: "forks",
          maxWorkers: 1,
        },
      },
    ],
  },
});
