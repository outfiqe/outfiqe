import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@test": path.resolve(import.meta.dirname, "./src/testing"),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      include: [
        "src/features/auth/utils/safeRedirect.ts",
        "src/features/auth/hooks/**",
        "src/components/ProductGridSkeleton.tsx",
        "src/features/brand-profile/hooks/useInfiniteBrandProducts.ts",
        "src/features/brand-profile/api/brandProfileApi.ts",
        "src/features/search/components/ExploreSearchBox.tsx",
        "src/features/search/hooks/useExploreAutocomplete.ts",
        "src/features/creator-dashboard/components/AchievementBadgeIcon.tsx",
        "src/features/creator-dashboard/components/XpMultiplierBanner.tsx",
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
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.integration.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["./src/testing/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.{ts,tsx}"],
          environment: "jsdom",
          setupFiles: ["./src/testing/setup.ts", "./src/testing/integration/setup.ts"],
        },
      },
    ],
  },
});
