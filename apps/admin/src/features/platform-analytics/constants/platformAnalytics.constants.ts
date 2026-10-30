import { ANALYTICS_EVENTS } from "@outfiqe/utils";

export const ANALYTICS_RANGES = ["7d", "30d", "90d"] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const DEFAULT_ANALYTICS_RANGE: AnalyticsRange = "30d";

export const ANALYTICS_RANGE_LABEL: Record<AnalyticsRange, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export const INSIGHT_STATUSES = ["fresh", "stale", "not_connected", "unavailable"] as const;

export const PLATFORM_ANALYTICS_QUERY_KEY = ["platform-analytics"] as const;

export const EXACT_ORDER_TOTALS_QUERY_KEY = ["platform-analytics", "exact-order-totals"] as const;

export const FUNNEL_STEP_LABEL: Record<string, string> = {
  [ANALYTICS_EVENTS.LOOK_DETAIL_VIEW]: "Opened a look",
  [ANALYTICS_EVENTS.LOOK_PRODUCT_TAG_CLICK]: "Tapped a tagged product",
  [ANALYTICS_EVENTS.PRODUCT_DETAIL_VIEW]: "Viewed a product",
  [ANALYTICS_EVENTS.CART_ITEM_ADD]: "Added to cart",
  [ANALYTICS_EVENTS.CHECKOUT_START]: "Started checkout",
  [ANALYTICS_EVENTS.ORDER_SUBMIT]: "Pressed Place order",
  [ANALYTICS_EVENTS.ORDER_PLACE]: "Order placed",
};

export const ANALYTICS_PAYMENT_METHOD_LABEL: Record<string, string> = {
  cod: "Cash on delivery",
  esewa: "eSewa",
  khalti: "Khalti",
};

export const DIRECT_TRAFFIC_SOURCE = "$direct";

export const DIRECT_TRAFFIC_LABEL = "Direct or unknown";

export const ANALYTICS_PAGE_DESCRIPTION =
  "How shoppers find Outfiqe, where they drop out before buying, and whether they come back.";

export const ESTIMATE_NOTE =
  "Visitor and funnel numbers come from PostHog and are close estimates: visitors who block tracking aren't counted. Order and money cards come straight from the database and are exact.";

export const INSIGHT_MESSAGE = {
  NOT_CONNECTED:
    "Analytics isn't connected yet. Add the read-only PostHog key (POSTHOG_QUERY_API_KEY and POSTHOG_PROJECT_ID) to the API server to see these numbers.",
  UNAVAILABLE: "PostHog didn't answer just now. Try again in a few minutes.",
  REQUEST_FAILED: "Couldn't load this section.",
  STALE: "PostHog didn't answer, so this shows the last saved numbers",
} as const;

export const EXACT_TOTALS_UNAVAILABLE_MESSAGE =
  "Order and money totals need the finance permission, which your role doesn't have.";

export const OPEN_IN_POSTHOG_LABEL = "Open in PostHog";

export const DELETED_MUSE_LABEL = "A muse whose account no longer exists";
