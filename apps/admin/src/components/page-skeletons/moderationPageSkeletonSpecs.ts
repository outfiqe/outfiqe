import type { AdminPageSkeletonSpec } from "./adminPageSkeleton.types";
import {
  FEATURES_DIR,
  OVERVIEW_TILE_COUNT,
  POSTER_COUNT,
  ROW_COUNT,
} from "./pageSkeletonSpecs.constants";

export const moderationPageSkeletonSpecs: Record<string, AdminPageSkeletonSpec> = {
  "/tag-reviews": {
    title: "Tag reviews",
    description:
      "How the Brand Tag Review funnel is running across every brand. All-time unless noted.",
    blocks: [
      { kind: "bar" },
      { kind: "statCards", count: OVERVIEW_TILE_COUNT, columns: "four", hasDelta: true },
      { kind: "bar" },
      { kind: "infoCards", cards: [{ rowCount: 2 }, { rowCount: 2 }, { rowCount: 3 }] },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/tag-reviews/components/TagReviewMetricsPage.tsx`,
      `${FEATURES_DIR}/tag-reviews/components/MetricsOverviewStrip.tsx`,
      `${FEATURES_DIR}/tag-reviews/components/ApprovalSourceMixSection.tsx`,
      `${FEATURES_DIR}/tag-reviews/components/MetricsDetailSections.tsx`,
      `${FEATURES_DIR}/tag-reviews/components/MetricsCardParts.tsx`,
      `${FEATURES_DIR}/tag-reviews/constants/tagReviewMetrics.constants.ts`,
    ],
  },
  "/content-browser": {
    title: "Browse drops",
    description:
      "Search muse drops and chimes directly and take one down without waiting for a report.",
    blocks: [
      { kind: "searchInput", placeholder: "Search by caption or muse…" },
      { kind: "posterGrid", count: POSTER_COUNT },
    ],
    sourceFiles: [`${FEATURES_DIR}/content-browser/components/ContentBrowserPage.tsx`],
  },
  "/content-reports": {
    title: "Content reports",
    description: "Drops and chimes flagged by viewers.",
    blocks: [
      { kind: "filterTabs", labels: ["Open", "Actioned", "Dismissed"] },
      { kind: "reportRows", count: ROW_COUNT },
    ],
    sourceFiles: [`${FEATURES_DIR}/content-reports/components/ContentReportsPage.tsx`],
  },
  "/tag-reports": {
    title: "Tag reports",
    description: "Counterfeit and misleading-tag reports from viewers and brands.",
    blocks: [
      { kind: "filterTabs", labels: ["Open", "Actioned", "Dismissed"] },
      { kind: "reportRows", count: ROW_COUNT, hasLeadingName: true },
    ],
    sourceFiles: [`${FEATURES_DIR}/tag-reports/components/TagReportsPage.tsx`],
  },
  "/support": {
    title: "Support requests",
    blocks: [
      { kind: "labeledStats", labels: ["Open", "Unassigned", "Awaiting us", "Oldest waiting"] },
      { kind: "selectBar", options: ["All assignees", "All statuses"] },
      { kind: "cardRows", count: ROW_COUNT, hasBadge: false, textLineCount: 2, actionLabels: [] },
    ],
    sourceFiles: [`${FEATURES_DIR}/support/components/SupportInboxPage.tsx`],
  },
  "/users": {
    title: "Users",
    description: "Search for an account to suspend, ban, or restore it.",
    blocks: [
      { kind: "searchInput", placeholder: "Search by name, username, or email…" },
      {
        kind: "cardRows",
        count: ROW_COUNT,
        actionSize: "default",
        actionLabels: ["Suspend", "Ban"],
      },
    ],
    sourceFiles: [`${FEATURES_DIR}/users/components/UsersPage.tsx`],
  },
  "/product-reviews": {
    title: "Product Reviews",
    description: "Search a product to view and moderate its customer reviews.",
    blocks: [{ kind: "searchInput", placeholder: "Search products by name…" }],
    sourceFiles: [`${FEATURES_DIR}/product-reviews/components/ProductReviewsPage.tsx`],
  },
};
