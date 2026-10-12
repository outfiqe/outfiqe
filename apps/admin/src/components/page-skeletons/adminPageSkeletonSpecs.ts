import type { AdminPageSkeletonSpec } from "./adminPageSkeleton.types";
import { brandTenantsPageSkeletonSpecs } from "./brandTenantsPageSkeletonSpecs";
import { catalogPageSkeletonSpecs } from "./catalogPageSkeletonSpecs";
import { commercePageSkeletonSpecs } from "./commercePageSkeletonSpecs";
import { financePageSkeletonSpecs } from "./financePageSkeletonSpecs";
import { growthPageSkeletonSpecs } from "./growthPageSkeletonSpecs";
import { moderationPageSkeletonSpecs } from "./moderationPageSkeletonSpecs";
import { FEATURES_DIR, KPI_CARD_COUNT } from "./pageSkeletonSpecs.constants";
import { platformSettingsPageSkeletonSpecs } from "./platformSettingsPageSkeletonSpecs";

export const ADMIN_PAGE_SKELETON_SPECS: Record<string, AdminPageSkeletonSpec> = {
  "/platform": {
    title: "Overview",
    description: "Platform-wide totals, activity trend and settlement reconciliation.",
    blocks: [
      { kind: "statCards", count: KPI_CARD_COUNT, columns: "six" },
      {
        kind: "tiles",
        title: "Quick access",
        labels: [
          "Orders",
          "Products",
          "Brand applications",
          "Coupons",
          "Withdrawal requests",
          "Support requests",
        ],
      },
      {
        kind: "chartCard",
        title: "Activity",
        description: "Platform-wide CRM activity per day",
      },
      {
        kind: "section",
        title: "Settlement reconciliation",
        description: "Gateway money held vs. what the ledger says is owed, last 30 days.",
        blocks: [{ kind: "statCards", count: 3, columns: "four" }],
      },
    ],
    sourceFiles: [`${FEATURES_DIR}/platform-metrics/components/PlatformOverviewPage.tsx`],
  },
  "/profile": {
    title: "Edit profile",
    isNarrow: true,
    blocks: [
      {
        kind: "formCard",
        layout: "stacked",
        fields: [
          { label: "Avatar", isImage: true },
          { label: "Name", width: "large" },
          { label: "Email", width: "large" },
        ],
        submitLabel: "Save changes",
      },
      {
        kind: "section",
        title: "Change password",
        description: "Changing your password signs out your other devices.",
        blocks: [
          {
            kind: "formCard",
            layout: "stacked",
            fields: [
              { label: "Current password", width: "large" },
              { label: "New password", width: "large" },
              { label: "Confirm new password", width: "large" },
            ],
            submitLabel: "Update password",
          },
        ],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/profile/components/ProfilePage.tsx`,
      `${FEATURES_DIR}/profile/components/ChangePasswordCard.tsx`,
    ],
  },
  ...catalogPageSkeletonSpecs,
  ...commercePageSkeletonSpecs,
  ...moderationPageSkeletonSpecs,
  ...financePageSkeletonSpecs,
  ...growthPageSkeletonSpecs,
  ...brandTenantsPageSkeletonSpecs,
  ...platformSettingsPageSkeletonSpecs,
};
