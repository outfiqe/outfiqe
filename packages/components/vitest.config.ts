import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const COVERAGE_THRESHOLD = 80;

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: "v8",
      include: [
        "src/header/HeaderBar.tsx",
        "src/header/useHeaderHeightVar.ts",
        "src/notifications/NotificationBell.tsx",
      ],
      exclude: ["src/**/*.test.tsx", "src/testing/**"],
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
          include: ["src/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["./src/testing/setup.tsx"],
        },
      },
    ],
  },
});
