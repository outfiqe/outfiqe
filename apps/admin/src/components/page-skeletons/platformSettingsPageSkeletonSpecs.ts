import type { AdminPageSkeletonSpec } from "./adminPageSkeleton.types";
import { FEATURES_DIR } from "./pageSkeletonSpecs.constants";

export const platformSettingsPageSkeletonSpecs: Record<string, AdminPageSkeletonSpec> = {
  "/platform/features": {
    title: "Feature flags",
    description:
      "Override a plan default for one tenant. Clearing an override reverts to the plan.",
    blocks: [
      { kind: "labeledSelect", label: "Tenant", option: "Select a tenant" },
      { kind: "table", headers: ["Feature", "State", "Source", "Actions"] },
    ],
    sourceFiles: [`${FEATURES_DIR}/platform-features/components/PlatformFeaturesPage.tsx`],
  },
  "/platform/nav-access": {
    title: "Navigation access",
    description:
      "Choose which platform navigation items every non-co-founder admin can see and reach. Co-founders always see everything.",
    blocks: [
      {
        kind: "section",
        title: "Navigation items",
        blocks: [{ kind: "toggleRows", count: 6 }],
      },
    ],
    sourceFiles: [`${FEATURES_DIR}/platform-nav-access/components/PlatformNavAccessPage.tsx`],
  },
};
