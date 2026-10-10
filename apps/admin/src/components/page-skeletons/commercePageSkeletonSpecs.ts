import type { AdminPageSkeletonSpec } from "./adminPageSkeleton.types";
import { FEATURES_DIR, ROW_COUNT } from "./pageSkeletonSpecs.constants";

export const commercePageSkeletonSpecs: Record<string, AdminPageSkeletonSpec> = {
  "/orders": {
    title: "Orders",
    blocks: [
      {
        kind: "filterTabs",
        labels: ["All", "Placed", "Packed", "Shipped", "Delivered", "Cancelled"],
      },
      {
        kind: "cardRows",
        count: ROW_COUNT,
        hasBadge: false,
        hasTrailingBadge: true,
        actionLabels: [],
      },
    ],
    sourceFiles: [`${FEATURES_DIR}/orders/components/OrdersPage.tsx`],
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
      `${FEATURES_DIR}/coupons/components/CouponsPage.tsx`,
      `${FEATURES_DIR}/coupons/components/CouponsListSection.tsx`,
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
      `${FEATURES_DIR}/delivery-zones/components/DeliveryZonesPage.tsx`,
      `${FEATURES_DIR}/delivery-zones/components/DeliveryZonesSection.tsx`,
      `${FEATURES_DIR}/delivery-zones/components/DeliveryZoneHistorySection.tsx`,
    ],
  },
};
