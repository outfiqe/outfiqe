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
        "src/features/brands/**",
        "src/features/creator-profile/api/creatorProfileApi.ts",
        "src/features/creator-profile/api/creatorProfileSchemas.ts",
        "src/features/creator-profile/components/**",
        "src/features/creator-profile/hooks/**",
        "src/features/creator-profile/index.ts",
        "src/features/creator-dashboard/api/commissionApi.ts",
        "src/features/creator-dashboard/api/commissionSchemas.ts",
        "src/features/creator-dashboard/api/creatorDashboardApi.ts",
        "src/features/creator-dashboard/api/creatorDashboardSchemas.ts",
        "src/features/creator-dashboard/api/creatorLinksApi.ts",
        "src/features/creator-dashboard/api/creatorLinksSchemas.ts",
        "src/features/creator-dashboard/api/creatorLooksApi.ts",
        "src/features/creator-dashboard/api/creatorLooksSchemas.ts",
        "src/features/creator-dashboard/components/AchievementBadgeCard.tsx",
        "src/features/creator-dashboard/components/ApplyAsCreatorButton.tsx",
        "src/features/creator-dashboard/components/CommissionStatusBadge.tsx",
        "src/features/creator-dashboard/components/CreatorStatusGate.tsx",
        "src/features/creator-dashboard/components/EarningsLedgerRow.tsx",
        "src/features/creator-dashboard/components/EarningsSection.tsx",
        "src/features/creator-dashboard/components/EarningsSummaryTiles.tsx",
        "src/features/creator-dashboard/components/EditPostForm.tsx",
        "src/features/creator-dashboard/components/EditPostModal.tsx",
        "src/features/creator-dashboard/components/PostModal.tsx",
        "src/features/creator-dashboard/components/ProductTagPicker.tsx",
        "src/features/creator-dashboard/components/ShareLinkRow.tsx",
        "src/features/creator-dashboard/components/ShareProductPicker.tsx",
        "src/features/creator-dashboard/components/ShareSection.tsx",
        "src/features/creator-dashboard/components/XpMultiplierBanner.tsx",
        "src/features/creator-dashboard/hooks/useEarningsSummary.ts",
        "src/features/creator-dashboard/hooks/useGamificationSocket.ts",
        "src/features/creator-dashboard/hooks/useLookDetail.ts",
        "src/features/creator-dashboard/hooks/useMyCreatorLinks.ts",
        "src/features/creator-dashboard/hooks/useMyEarnings.ts",
        "src/features/creator-dashboard/hooks/useTaggableProducts.ts",
        "src/features/creator-dashboard/schemas/lookForm.schema.ts",
        "src/features/creator-dashboard/utils/creatorLinksCacheUpdate.ts",
        "src/features/creator-dashboard/index.ts",
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
