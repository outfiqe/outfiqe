import { defineConfig } from "vitest/config";

const COVERAGE_THRESHOLD = 80;

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: ["src/uuid/index.ts"],
      thresholds: {
        lines: COVERAGE_THRESHOLD,
        functions: COVERAGE_THRESHOLD,
        branches: COVERAGE_THRESHOLD,
        statements: COVERAGE_THRESHOLD,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
        },
      },
    ],
  },
});
