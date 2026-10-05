import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const COVERAGE_THRESHOLD = 80;

export default defineConfig({
  plugins: [react()],
  test: {
    coverage: {
      provider: "v8",
      include: [
        "src/studio-badge-visual.utils.ts",
        "src/form-banner.tsx",
        "src/outfit-slot-icon.tsx",
        "src/cheriq-icon.tsx",
        "src/logo-mark.tsx",
        "src/logo.constants.ts",
        "src/brand-palette.ts",
        "src/autocomplete.tsx",
        "src/chart.tsx",
        "src/chart-card.tsx",
        "src/trend-chart.tsx",
        "src/bar-series.tsx",
        "src/stat-card.tsx",
        "src/drawer.tsx",
        "src/modal.tsx",
        "src/layers.ts",
        "src/table.tsx",
        "src/tour.tsx",
        "src/use-media-query.ts",
        "src/theme.ts",
        "src/theme-init.ts",
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
