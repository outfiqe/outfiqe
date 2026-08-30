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
        "src/features/brand-applications/schemas.ts",
        "src/features/brand-applications/api.ts",
        "src/features/brand-applications/hooks/useInfiniteBrandApplications.ts",
        "src/components/Logo.tsx",
        "src/features/gamification/designConfig.utils.ts",
        "src/features/gamification/BadgesSection/badgeForm.utils.ts",
        "src/features/gamification/BadgesSection/BadgeFormPage.tsx",
        "src/features/gamification/BadgesSection/DesignStudio/studioLayer.utils.ts",
        "src/features/gamification/BadgesSection/DesignStudio/BadgeDesignSection.tsx",
        "src/features/crm/**/*.{ts,tsx}",
        "src/features/organizations/**/*.{ts,tsx}",
        "src/lib/brandsApi.ts",
        "src/features/auth/AuthContext.tsx",
        "src/components/ProtectedRoute.tsx",
        "src/components/ProtectedRoute.utils.ts",
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
          environmentOptions: { jsdom: { url: "http://localhost:3000" } },
          setupFiles: ["./src/testing/setup.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.{ts,tsx}"],
          environment: "jsdom",
          environmentOptions: { jsdom: { url: "http://localhost:3000" } },
          setupFiles: ["./src/testing/setup.ts", "./src/testing/integration/setup.ts"],
          testTimeout: 15000,
        },
      },
    ],
  },
});
