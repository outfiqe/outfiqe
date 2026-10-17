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
  "/orders/refunds": {
    title: "Refunds to pay",
    description:
      "Refunds that couldn't go back automatically. Send the money, then mark each one paid with the transfer reference.",
    blocks: [
      {
        kind: "cardRows",
        count: ROW_COUNT,
        hasTrailingBadge: true,
        textLineCount: 3,
        actionLabels: ["Mark as paid"],
        actionSize: "sm",
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/orders/refunds/components/RefundQueuePage.tsx`,
      `${FEATURES_DIR}/orders/refunds/components/RefundQueueCard.tsx`,
    ],
  },
  "/orders/unavailable-items": {
    title: "Items brands can't supply",
    description:
      "Approving refunds the customer for those units. Rejecting tells the brand to send them.",
    blocks: [
      { kind: "filterTabs", labels: ["To review", "Approved", "Rejected"] },
      {
        kind: "cardRows",
        count: ROW_COUNT,
        hasTrailingBadge: true,
        textLineCount: 3,
        actionLabels: ["Approve and refund", "Reject"],
        actionSize: "sm",
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/orders/unavailable-items/components/UnavailableItemsPage.tsx`,
      `${FEATURES_DIR}/orders/unavailable-items/constants/unavailableItemLabels.ts`,
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
              { label: "Shortest delivery (working days)", width: "small" },
              { label: "Longest delivery (working days)", width: "small" },
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
  "/logistics/hubs": {
    title: "Hubs",
    description:
      "Outfiqe's warehouses: their hours, pickup rounds and the areas riders collect from.",
    headerActionLabel: "Add hub",
    blocks: [
      {
        kind: "cardRows",
        count: ROW_COUNT,
        hasChipRow: true,
        hasBadge: true,
        textLineCount: 3,
        actionLabels: ["Edit", "Pickup areas"],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/logistics/hubs/components/HubsPage.tsx`,
      `${FEATURES_DIR}/logistics/hubs/components/HubCard.tsx`,
    ],
  },
  "/logistics/riders": {
    title: "Riders",
    description:
      "The people who collect bags from brands. Invite them, check IDs in person and manage their access.",
    headerActionLabel: "Invite rider",
    blocks: [
      {
        kind: "cardRows",
        count: ROW_COUNT,
        hasBadge: true,
        textLineCount: 2,
        actionLabels: ["Suspend", "Offboard"],
        actionSize: "sm",
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/logistics/riders/components/RidersPage.tsx`,
      `${FEATURES_DIR}/logistics/riders/utils/riderActions.utils.ts`,
    ],
  },
  "/logistics/pickup-board": {
    title: "Pickup board",
    description:
      "Bags brands have marked ready. Pick the bags at a location and give them to a rider.",
    blocks: [
      {
        kind: "section",
        title: "Waiting for a rider",
        blocks: [
          {
            kind: "cardRows",
            count: ROW_COUNT,
            textLineCount: 3,
            actionLabels: ["Assign rider"],
            actionSize: "sm",
          },
        ],
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/logistics/pickup-board/components/PickupBoardPage.tsx`,
      `${FEATURES_DIR}/logistics/pickup-board/components/PickupLocationCard.tsx`,
    ],
  },
  "/logistics/bag-tags": {
    title: "Bag stickers",
    description:
      "Print sheets of QR stickers for riders. Each sticker goes on one bag when it's collected.",
    blocks: [
      {
        kind: "actionRows",
        count: ROW_COUNT,
        actionLabel: "Open sheet",
      },
    ],
    sourceFiles: [`${FEATURES_DIR}/logistics/bag-tags/components/BagTagsPage.tsx`],
  },
  "/logistics/packing": {
    title: "Inspect and pack",
    description:
      "Orders with bags at the hub. Inspect each bag, then pack the order into one parcel.",
    blocks: [
      {
        kind: "cardRows",
        count: ROW_COUNT,
        textLineCount: 3,
        actionLabels: ["Pack parcel"],
        actionSize: "sm",
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/logistics/hub-operations/components/PackingPage.tsx`,
      `${FEATURES_DIR}/logistics/hub-operations/components/OrderToPackCard.tsx`,
    ],
  },
  "/logistics/parcels": {
    title: "Parcels",
    description:
      "Book packed parcels with a partner, print labels and follow them to the customer.",
    blocks: [
      {
        kind: "filterTabs",
        labels: ["To book", "Ready to hand over", "With the partner", "Finished"],
      },
      {
        kind: "cardRows",
        count: ROW_COUNT,
        hasTrailingBadge: true,
        textLineCount: 3,
        actionLabels: ["Print label", "Open"],
        actionSize: "sm",
      },
    ],
    sourceFiles: [
      `${FEATURES_DIR}/logistics/shipments/components/ParcelsPage.tsx`,
      `${FEATURES_DIR}/logistics/shipments/components/ParcelCard.tsx`,
      `${FEATURES_DIR}/logistics/shipments/constants/parcelLabels.ts`,
    ],
  },
  "/logistics/partners": {
    title: "Delivery partners",
    description:
      "The couriers that deliver parcels from the hub, where they deliver and how their status names map to ours.",
    headerActionLabel: "Add partner",
    blocks: [{ kind: "cardRows", count: ROW_COUNT, hasTrailingBadge: true, actionLabels: [] }],
    sourceFiles: [`${FEATURES_DIR}/logistics/partners/components/PartnersPage.tsx`],
  },
};
