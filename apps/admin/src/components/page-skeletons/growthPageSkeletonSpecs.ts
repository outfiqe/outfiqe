import type { AdminPageSkeletonSpec } from "./adminPageSkeleton.types";
import {
  FEATURES_DIR,
  GAMIFICATION_STAT_COUNT,
  GRID_CARD_COUNT,
  ROW_COUNT,
} from "./pageSkeletonSpecs.constants";

export const growthPageSkeletonSpecs: Record<string, AdminPageSkeletonSpec> = {
  "/gamification": {
    title: "Gamification",
    spacing: "loose",
    blocks: [
      {
        kind: "section",
        title: "Overview",
        blocks: [{ kind: "statCards", count: GAMIFICATION_STAT_COUNT, columns: "five" }],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/gamification/components/GamificationOverviewPage.tsx`,
      `${FEATURES_DIR}/gamification/stats/components/StatsSection.tsx`,
    ],
  },
  "/trending": {
    title: "Trending debug",
    description:
      "See what's trending right now, or look up any approved product to see exactly why it is, or isn't, trending.",
    blocks: [
      {
        kind: "labeledSelect",
        label: "Search for a specific product",
        option: "Search by product name",
      },
    ],
    sourceFiles: [`${FEATURES_DIR}/trending/components/TrendingDebugPage.tsx`],
  },
  "/creators": {
    title: "Muses",
    blocks: [
      { kind: "filterTabs", labels: ["Pending", "Approved", "Rejected"] },
      {
        kind: "cardRows",
        count: ROW_COUNT,
        hasBadge: false,
        actionSize: "default",
        actionLabels: ["Approve", "Reject"],
      },
    ],
    sourceFiles: [`${FEATURES_DIR}/creators/components/CreatorsPage.tsx`],
  },
  "/announcements": {
    title: "Announcements",
    blocks: [
      {
        kind: "filterTabs",
        labels: ["DRAFT", "SCHEDULED", "SENDING", "SENT", "CANCELED"],
        actionLabel: "New announcement",
      },
      {
        kind: "cardRows",
        count: ROW_COUNT,
        hasMetaLine: true,
        actionLabels: ["Edit", "Send", "Discard"],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/announcements/components/AnnouncementsPage.tsx`,
      `${FEATURES_DIR}/announcements/components/AnnouncementsListSection.tsx`,
    ],
  },
  "/gamification/badges": {
    title: "Badges & Challenges",
    spacing: "loose",
    blocks: [
      {
        kind: "section",
        title: "Badges",
        description: "The full badge catalog — rule-based and admin-award.",
        actionLabel: "New badge",
        blocks: [{ kind: "badgeGrid", count: GRID_CARD_COUNT }],
      },
      {
        kind: "section",
        title: "Challenges",
        description:
          "Time-boxed goals users can complete for a badge and XP — separate from the general badge catalog.",
        actionLabel: "New challenge",
        blocks: [{ kind: "titleActionGrid", count: GRID_CARD_COUNT }],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/gamification/components/GamificationBadgesPage.tsx`,
      `${FEATURES_DIR}/gamification/badges/components/BadgesSection.tsx`,
      `${FEATURES_DIR}/gamification/challenges/components/ChallengesSection.tsx`,
    ],
  },
  "/gamification/leaderboards": {
    title: "Leaderboards",
    spacing: "loose",
    blocks: [
      {
        kind: "section",
        title: "Muse leaderboard",
        description:
          "Each ranking can be shown or hidden independently on the public leaderboard page — turning one off removes it from the page immediately, it doesn't stop the numbers behind it from being tracked.",
        blocks: [{ kind: "toggleRows", count: ROW_COUNT }],
      },
      {
        kind: "section",
        title: "Muse competitions",
        description:
          "An ongoing weekly rule, not a one-off event — the top finishers in a leaderboard category win the trophy badge automatically every week, settled the moment each ISO week ends. Deactivating a competition stops future settlements without taking back badges already won.",
        blocks: [
          {
            kind: "formCard",
            fields: [
              { label: "Name", width: "medium" },
              { label: "Icon", width: "small" },
              { label: "Category", width: "medium" },
              { label: "Rarity", width: "small" },
            ],
            submitLabel: "Create competition",
          },
          { kind: "titleActionGrid", count: ROW_COUNT },
        ],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/gamification/components/GamificationLeaderboardsPage.tsx`,
      `${FEATURES_DIR}/gamification/leaderboards/components/LeaderboardSection.tsx`,
      `${FEATURES_DIR}/gamification/competitions/components/CompetitionsSection.tsx`,
      `${FEATURES_DIR}/gamification/competitions/components/CompetitionFields.tsx`,
      `${FEATURES_DIR}/gamification/competitions/components/EditCompetitionModal.tsx`,
    ],
  },
  "/gamification/manual-actions": {
    title: "Manual Actions",
    spacing: "loose",
    blocks: [
      {
        kind: "section",
        title: "Manual award",
        description:
          "Hand-award a badge to a specific user, with a mandatory reason for the audit trail.",
        blocks: [
          {
            kind: "formCard",
            fields: [
              { label: "User", width: "medium" },
              { label: "Badge", width: "medium" },
              { label: "Reason", width: "large" },
            ],
          },
        ],
      },
      {
        kind: "section",
        title: "Manual XP adjustment",
        description: "Grant or dock XP for a specific user. Docking below zero is rejected.",
        blocks: [
          {
            kind: "formCard",
            fields: [
              { label: "User", width: "medium" },
              { label: "Amount", width: "small" },
              { label: "Reason", width: "large" },
            ],
          },
        ],
      },
      {
        kind: "section",
        title: "Manually awarded badges",
        blocks: [{ kind: "actionRows", count: ROW_COUNT, actionLabel: "Remove" }],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/gamification/components/GamificationManualActionsPage.tsx`,
      `${FEATURES_DIR}/gamification/manual-actions/components/ManualActionsSection.tsx`,
    ],
  },
  "/gamification/xp-levels": {
    title: "XP & Levels",
    spacing: "loose",
    blocks: [
      {
        kind: "section",
        title: "Levels",
        description:
          "The XP ladder every user climbs. Deactivating a level doesn't remove it from anyone already there — it just stops it from being assigned going forward.",
        actionLabel: "Add level",
        blocks: [{ kind: "actionRows", count: ROW_COUNT }],
      },
      {
        kind: "section",
        title: "XP multipliers",
        description:
          'Time-boxed events that scale up activity-earned XP — a "2x weekend," for example. Only the highest-multiplier active window applies if more than one overlaps. Manual XP adjustments and achievement/badge rewards are never multiplied.',
        actionLabel: "Add multiplier",
        blocks: [{ kind: "actionRows", count: ROW_COUNT }],
      },
      {
        kind: "section",
        title: "Activity XP",
        description: "How much XP each platform activity awards, and the anti-abuse limits on it.",
        blocks: [{ kind: "actionRows", count: ROW_COUNT, hasSubLine: true }],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/gamification/components/GamificationXpLevelsPage.tsx`,
      `${FEATURES_DIR}/gamification/levels/components/LevelsSection.tsx`,
      `${FEATURES_DIR}/gamification/multipliers/components/MultipliersSection.tsx`,
      `${FEATURES_DIR}/gamification/activity-config/components/ActivityConfigSection.tsx`,
    ],
  },
};
