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
    description: "What needs action today, where the money went, and how the CRM is being used.",
    blocks: [
      { kind: "statCards", count: KPI_CARD_COUNT, columns: "six" },
      {
        kind: "tiles",
        title: "Needs action",
        labels: [
          "Orders",
          "Products",
          "Brand applications",
          "Refunds",
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
        title: "Where the money went",
        description: "Orders paid in the last 30 days, followed all the way through.",
        blocks: [{ kind: "statCards", count: 3, columns: "four" }],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/platform-metrics/components/PlatformOverviewPage.tsx`,
      `${FEATURES_DIR}/platform-metrics/components/QuickAccessSection.tsx`,
      `${FEATURES_DIR}/financial-rollup/components/MoneyBreakdownSection.tsx`,
    ],
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
