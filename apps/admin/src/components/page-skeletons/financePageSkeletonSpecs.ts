import type { AdminPageSkeletonSpec } from "./adminPageSkeleton.types";
import { FEATURES_DIR, ROW_COUNT } from "./pageSkeletonSpecs.constants";

export const financePageSkeletonSpecs: Record<string, AdminPageSkeletonSpec> = {
  "/financial-rollup": {
    title: "Financial rollup",
    blocks: [
      { kind: "filterTabs", labels: ["This cycle", "Last 30 days", "All time"] },
      { kind: "statCards", count: 1, columns: "four", hasDelta: true },
      {
        kind: "infoCards",
        cards: [
          {
            title: "Gateway",
            description: "Money actually collected via payment gateways.",
            rowCount: 3,
          },
          {
            title: "Ledger",
            description: "What's owed to muses and brands per the settlement ledger.",
            rowCount: 4,
          },
        ],
      },
    ],
    sourceFiles: [`${FEATURES_DIR}/financial-rollup/components/FinancialRollupPage.tsx`],
  },
  "/withdraw-policy": {
    title: "Withdrawal policy",
    blocks: [
      { kind: "filterTabs", labels: ["Muse", "Business"] },
      {
        kind: "formCard",
        layout: "grid",
        fields: [
          { label: "Min amount (Rs.)", width: "large" },
          { label: "Max amount (Rs.)", width: "large" },
          { label: "Window type", width: "large" },
          { label: "Window value (days before month end / every N days)", width: "large" },
          { label: "Attempts per window", width: "large" },
          { label: "Cooldown after rejection (days)", width: "large" },
          { label: "Processing note", width: "large" },
        ],
        submitLabel: "Save policy",
      },
    ],
    sourceFiles: [`${FEATURES_DIR}/withdraw-policy/components/WithdrawPolicyPage.tsx`],
  },
  "/commissions": {
    title: "Commissions",
    spacing: "loose",
    blocks: [
      {
        kind: "section",
        title: "Drop commission",
        description:
          "Fixed commission a muse earns when someone buys from their drop or link, by the sold item's price band.",
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
        title: "Commissions earned",
        blocks: [
          { kind: "filterTabs", labels: ["PENDING", "APPROVED", "AVAILABLE", "PAID", "VOIDED"] },
          { kind: "cardRows", count: ROW_COUNT, actionLabels: ["Approve", "Mark paid"] },
        ],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/commissions/components/CommissionsPage.tsx`,
      `${FEATURES_DIR}/commissions/components/CommissionTiersSection.tsx`,
      `${FEATURES_DIR}/commissions/constants/commissionScopeCopy.ts`,
      `${FEATURES_DIR}/commissions/components/CommissionsListSection.tsx`,
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
      `${FEATURES_DIR}/withdraw-requests/components/WithdrawRequestsPage.tsx`,
      `${FEATURES_DIR}/withdraw-requests/components/WithdrawRequestsListSection.tsx`,
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
      `${FEATURES_DIR}/platform-commission/components/PlatformCommissionPage.tsx`,
      `${FEATURES_DIR}/platform-commission/components/CommissionTiersSection.tsx`,
      `${FEATURES_DIR}/platform-commission/components/GatewayFeeRatesSection.tsx`,
      `${FEATURES_DIR}/platform-commission/components/BrandExemptionsSection.tsx`,
    ],
  },
};
