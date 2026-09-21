import type { AdminPageSkeletonSpec } from "./adminPageSkeleton.types";

const FEATURES_DIR = "src/features";

const ROW_COUNT = 3;
const GRID_CARD_COUNT = 6;

const PILL_COUNT = 5;

export const ADMIN_PAGE_SKELETON_SPECS: Record<string, AdminPageSkeletonSpec> = {
  "/categories": {
    title: "Categories",
    blocks: [
      {
        kind: "formCard",
        fields: [
          { label: "Name", width: "large" },
          { label: "Slug", width: "medium" },
          { label: "Image", isImage: true },
        ],
        submitLabel: "Create category",
      },
      { kind: "reorderRows", count: ROW_COUNT, hasImage: true, actionLabel: "Unpublish" },
    ],
    sourceFiles: [`${FEATURES_DIR}/categories/CategoriesPage.tsx`],
  },

  "/collections": {
    title: "Collections",
    blocks: [
      {
        kind: "formCard",
        fields: [
          { label: "Name", width: "medium" },
          { label: "Slug", width: "medium" },
          { label: "Description", width: "large" },
          { label: "Image", isImage: true },
        ],
        submitLabel: "Create collection",
      },
      { kind: "imageRows", count: ROW_COUNT, actionLabels: ["Manage products", "Unpublish"] },
    ],
    sourceFiles: [`${FEATURES_DIR}/collections/CollectionsPage.tsx`],
  },

  "/hero-slides": {
    title: "Hero slides",
    blocks: [
      {
        kind: "formCard",
        fields: [
          { label: "Tag", width: "large" },
          { label: "Title", width: "large" },
          { label: "Description", width: "large" },
          { label: "CTA label", width: "medium" },
          { label: "CTA link", width: "large" },
          { label: "Image", isImage: true },
        ],
        submitLabel: "Create slide",
      },
      { kind: "imageRows", count: ROW_COUNT, actionLabels: ["Unpublish"] },
    ],
    sourceFiles: [`${FEATURES_DIR}/hero-slides/HeroSlidesPage.tsx`],
  },

  "/product-types": {
    title: "Garment types",
    description:
      "The list of clothing types a product can be. A new type reaches brands once it is on and has at least one size.",
    blocks: [
      {
        kind: "formCard",
        fields: [
          { label: "Name", width: "medium" },
          { label: "Slug", width: "medium" },
        ],
        submitLabel: "Create type",
      },
      { kind: "reorderRows", count: ROW_COUNT, actionLabel: "Switch off" },
    ],
    sourceFiles: [`${FEATURES_DIR}/product-types/ProductTypesPage.tsx`],
  },

  "/size-options": {
    title: "Sizes",
    description: "The size list a brand picks from when adding a product, per garment type.",
    blocks: [
      { kind: "pills", count: PILL_COUNT },
      { kind: "formCard", fields: [{ label: "Size label", width: "small" }] },
      { kind: "actionRows", count: ROW_COUNT, actionLabel: "Delete" },
    ],
    sourceFiles: [`${FEATURES_DIR}/size-options/SizeOptionsPage.tsx`],
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
      `${FEATURES_DIR}/announcements/AnnouncementsPage.tsx`,
      `${FEATURES_DIR}/announcements/AnnouncementsListSection.tsx`,
    ],
  },

  "/commissions": {
    title: "Commissions",
    spacing: "loose",
    blocks: [
      {
        kind: "section",
        title: "Commission tiers",
        description:
          "Fixed commission a creator earns per attributed sale, by the sold item's price band.",
        blocks: [
          {
            kind: "formCard",
            fields: [
              { label: "Min price (Rs.)", width: "small" },
              { label: "Max price (Rs.)", width: "small" },
              { label: "Commission (Rs.)", width: "small" },
              { label: "Sort order", width: "small" },
            ],
            submitLabel: "Add tier",
          },
          { kind: "actionRows", count: ROW_COUNT, actionCount: 2 },
        ],
      },
      {
        kind: "section",
        title: "Creator commissions",
        blocks: [
          { kind: "filterTabs", labels: ["PENDING", "APPROVED", "AVAILABLE", "PAID", "VOIDED"] },
          { kind: "cardRows", count: ROW_COUNT, actionLabels: ["Approve", "Mark paid"] },
        ],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/commissions/CommissionsPage.tsx`,
      `${FEATURES_DIR}/commissions/CommissionTiersSection.tsx`,
      `${FEATURES_DIR}/commissions/CommissionsListSection.tsx`,
    ],
  },

  "/coupons": {
    title: "Coupons",
    blocks: [
      { kind: "filterTabs", labels: ["Coupons", "Redemption lookup"] },
      { kind: "filterTabs", labels: ["ACTIVE", "PAUSED", "ARCHIVED"], actionLabel: "New coupon" },
      {
        kind: "cardRows",
        count: ROW_COUNT,
        hasMetaLine: true,
        actionLabels: ["Approve", "Edit budget", "Performance"],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/coupons/CouponsPage.tsx`,
      `${FEATURES_DIR}/coupons/CouponsListSection.tsx`,
    ],
  },

  "/delivery-zones": {
    title: "Delivery zones",
    spacing: "loose",
    blocks: [
      {
        kind: "section",
        title: "Delivery zones",
        description:
          "Delivery and cash-on-delivery fees, matched by city. An order from a city that doesn't match any zone uses the default zone's rates.",
        blocks: [
          {
            kind: "formCard",
            fields: [
              { label: "Zone name", width: "medium" },
              { label: "Cities", width: "large" },
              { label: "Standard delivery fee (Rs.)", width: "small" },
              { label: "Free delivery threshold (Rs.)", width: "small" },
              { label: "COD handling fee (Rs.)", width: "small" },
            ],
            submitLabel: "Add zone",
          },
          {
            kind: "cardRows",
            count: ROW_COUNT,
            hasChipRow: true,
            actionLabels: ["Set as default", "Edit", "Delete"],
          },
        ],
      },
      {
        kind: "section",
        title: "Change history",
        blocks: [{ kind: "historyRows", count: ROW_COUNT }],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/delivery-zones/DeliveryZonesPage.tsx`,
      `${FEATURES_DIR}/delivery-zones/DeliveryZonesSection.tsx`,
      `${FEATURES_DIR}/delivery-zones/DeliveryZoneHistorySection.tsx`,
    ],
  },

  "/withdraw-requests": {
    title: "Withdrawal requests",
    spacing: "loose",
    blocks: [
      { kind: "filterTabs", labels: ["PENDING", "UNDER_REVIEW", "APPROVED", "PAID", "REJECTED"] },
      { kind: "cardRows", count: ROW_COUNT, actionLabels: ["Approve", "Mark paid"] },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/withdraw-requests/WithdrawRequestsPage.tsx`,
      `${FEATURES_DIR}/withdraw-requests/WithdrawRequestsListSection.tsx`,
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
      `${FEATURES_DIR}/gamification/GamificationBadgesPage.tsx`,
      `${FEATURES_DIR}/gamification/BadgesSection/index.tsx`,
      `${FEATURES_DIR}/gamification/ChallengesSection/index.tsx`,
    ],
  },

  "/gamification/leaderboards": {
    title: "Leaderboards",
    spacing: "loose",
    blocks: [
      {
        kind: "section",
        title: "Creator leaderboard",
        description:
          "Each ranking can be shown or hidden independently on the public leaderboard page — turning one off removes it from the page immediately, it doesn't stop the numbers behind it from being tracked.",
        blocks: [{ kind: "toggleRows", count: ROW_COUNT }],
      },
      {
        kind: "section",
        title: "Creator competitions",
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
      `${FEATURES_DIR}/gamification/GamificationLeaderboardsPage.tsx`,
      `${FEATURES_DIR}/gamification/LeaderboardSection.tsx`,
      `${FEATURES_DIR}/gamification/CompetitionsSection.tsx`,
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
      `${FEATURES_DIR}/gamification/GamificationManualActionsPage.tsx`,
      `${FEATURES_DIR}/gamification/ManualActionsSection.tsx`,
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
      `${FEATURES_DIR}/gamification/GamificationXpLevelsPage.tsx`,
      `${FEATURES_DIR}/gamification/LevelsSection.tsx`,
      `${FEATURES_DIR}/gamification/MultipliersSection.tsx`,
      `${FEATURES_DIR}/gamification/ActivityConfigSection/index.tsx`,
    ],
  },

  "/platform-commission": {
    title: "Platform commission",
    spacing: "loose",
    blocks: [
      {
        kind: "section",
        title: "Commission tiers",
        description:
          "The default take rate a brand pays per sold item, banded by the item's price. Bands must start at Rs. 0, be contiguous, and the top band must be open-ended. Saving replaces the entire ladder as a new version — existing orders keep the rate that applied at checkout.",
        blocks: [
          {
            kind: "formCard",
            fields: [
              { label: "Min price (Rs.)", width: "small" },
              { label: "Max price (Rs.)", width: "small" },
              { label: "Fee type", width: "small" },
              { label: "Commission (%)", width: "small" },
            ],
          },
        ],
      },
      {
        kind: "section",
        title: "Gateway fee estimates",
        description:
          "The per-transaction processor fee estimate deducted alongside the platform commission for non-cash payments. Cash on delivery never carries a gateway fee.",
        blocks: [{ kind: "formCard", fields: [{ label: "New rate (%)", width: "small" }] }],
      },
      {
        kind: "section",
        title: "Brand commission exemptions",
        description:
          "Time-boxed brands that keep the full sale price with no platform commission. The gateway fee estimate still applies for non-cash payments.",
        blocks: [
          {
            kind: "formCard",
            fields: [
              { label: "Starts", width: "medium" },
              { label: "Ends", width: "medium" },
              { label: "Reason", width: "large" },
            ],
            submitLabel: "Add exemption",
          },
          { kind: "actionRows", count: ROW_COUNT, bodyLineCount: 1 },
        ],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/platform-commission/PlatformCommissionPage.tsx`,
      `${FEATURES_DIR}/platform-commission/CommissionTiersSection.tsx`,
      `${FEATURES_DIR}/platform-commission/GatewayFeeRatesSection.tsx`,
      `${FEATURES_DIR}/platform-commission/BrandExemptionsSection.tsx`,
    ],
  },
};
