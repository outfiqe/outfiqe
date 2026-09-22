import type { TourStep } from "@outfiqe/design-system";
import type { TourKey } from "@outfiqe/types";

export const BRAND_DASHBOARD_TOUR_KEY = "brand-dashboard" satisfies TourKey;
export const BRAND_DASHBOARD_TOUR_VERSION = 1;

export const TOUR_REPLAY_QUERY_PARAM = "tour";
export const BRAND_TOUR_REPLAY_HREF = `/overview?${TOUR_REPLAY_QUERY_PARAM}=${BRAND_DASHBOARD_TOUR_KEY}`;
export const BRAND_TOUR_REPLAY_LABEL = "Take the tour";

export const BRAND_KPI_TOUR_ANCHOR = "brand-kpis";

const sidebarItemSelector = (sidebarItemId: string) => `[data-sidebar-item-id="${sidebarItemId}"]`;

export const BRAND_DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to your brand dashboard",
    body: "Here is a quick look at where everything lives. It takes about a minute, and you can skip it at any time.",
  },
  {
    id: "overview-figures",
    anchorSelector: `[data-tour-anchor="${BRAND_KPI_TOUR_ANCHOR}"]`,
    title: "Your numbers at a glance",
    body: "Revenue is what customers paid for your items, before fees. Available and pending payout is what you actually receive after platform and payment fees. Hover the info marker on any card to see how it is worked out.",
  },
  {
    id: "products",
    anchorSelector: sidebarItemSelector("products"),
    title: "Products",
    body: "Add a product with photos, sizes and stock. New products are reviewed before they go live. Once live, you can edit them, restock, set a sale price or remove them yourself.",
  },
  {
    id: "tag-reviews",
    anchorSelector: sidebarItemSelector("tag-reviews"),
    title: "Tag reviews",
    body: "Creators tag your products in their looks. Approve or decline each tag here. You decide who can tag your products in your profile settings.",
  },
  {
    id: "orders",
    anchorSelector: sidebarItemSelector("orders"),
    title: "Orders",
    body: "Each order for your products arrives as a shipment. Mark it packed, then shipped with a carrier and tracking number, then delivered.",
  },
  {
    id: "wallet",
    anchorSelector: sidebarItemSelector("wallet"),
    title: "Wallet",
    body: "See your available and pending earnings, add a bank account, and request a withdrawal when you are ready.",
  },
  {
    id: "profile",
    anchorSelector: sidebarItemSelector("profile"),
    title: "Brand profile",
    body: "Keep your brand details up to date and choose who is allowed to tag your products.",
  },
  {
    id: "finish",
    title: "You are all set",
    body: "You can replay this tour whenever you like with the Take the tour button.",
  },
];
