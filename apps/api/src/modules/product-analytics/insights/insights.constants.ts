import type { AnalyticsSignupMethod } from "@outfiqe/utils";
import { hoursToMilliseconds } from "date-fns/hoursToMilliseconds";
import { millisecondsToSeconds } from "date-fns/millisecondsToSeconds";
import { minutesToSeconds } from "date-fns/minutesToSeconds";
import { secondsToMilliseconds } from "date-fns/secondsToMilliseconds";

const HOURS_IN_A_WEEK = 168;

export const INSIGHT_RANGES = ["7d", "30d", "90d"] as const;
export type InsightRange = (typeof INSIGHT_RANGES)[number];

export const DAYS_IN_INSIGHT_RANGE: Record<InsightRange, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

export const SPEED_DEVICES = ["all", "mobile", "desktop"] as const;
export type SpeedDevice = (typeof SPEED_DEVICES)[number];

export const SPEED_PAGES = ["all", "home", "products", "explore"] as const;
export type SpeedPage = (typeof SPEED_PAGES)[number];

export type SpeedFilters = { device: SpeedDevice; page: SpeedPage };

export const INSIGHT_NAMES = {
  OVERVIEW: "overview",
  PURCHASE_FUNNEL: "purchase-funnel",
  LOOK_TO_ORDER: "look-to-order",
  ACQUISITION: "acquisition",
  RETENTION: "retention",
  ZERO_RESULT_SEARCHES: "zero-result-searches",
  SITE_TRAFFIC: "site-traffic",
  SITE_SPEED: "site-speed-detail",
} as const;
export type InsightName = (typeof INSIGHT_NAMES)[keyof typeof INSIGHT_NAMES];

export const INSIGHT_STATUS = {
  FRESH: "fresh",
  STALE: "stale",
  NOT_CONNECTED: "not_connected",
  UNAVAILABLE: "unavailable",
} as const;
export type InsightStatus = (typeof INSIGHT_STATUS)[keyof typeof INSIGHT_STATUS];

export const FRESH_INSIGHT_TTL_SECONDS = minutesToSeconds(15);

export const LAST_GOOD_INSIGHT_TTL_SECONDS = millisecondsToSeconds(
  hoursToMilliseconds(HOURS_IN_A_WEEK),
);

export const MAX_INSTANT_COPY_AGE_HOURS = 24;

export const POSTHOG_QUERY_TIMEOUT_MS = secondsToMilliseconds(20);

export const POSTHOG_QUERY_NAME_PREFIX = "outfiqe-admin-analytics";

export const TOP_ROWS_LIMIT = 10;

export const ZERO_RESULT_SEARCHES_LIMIT = 20;

export const WEEKLY_ACTIVE_WEEKS = 8;

export const STAFF_CREATED_SIGNUP_METHOD: AnalyticsSignupMethod = "staff_created";

export const DIRECT_TRAFFIC_SOURCE = "$direct";

export const OWN_SITE_DOMAIN_SUFFIX = "outfiqe.com";

export const POSTHOG_PATH_BY_INSIGHT: Record<InsightName, string> = {
  [INSIGHT_NAMES.OVERVIEW]: "/web",
  [INSIGHT_NAMES.PURCHASE_FUNNEL]: "/insights",
  [INSIGHT_NAMES.LOOK_TO_ORDER]: "/insights",
  [INSIGHT_NAMES.ACQUISITION]: "/web",
  [INSIGHT_NAMES.RETENTION]: "/insights",
  [INSIGHT_NAMES.ZERO_RESULT_SEARCHES]: "/activity/explore",
  [INSIGHT_NAMES.SITE_TRAFFIC]: "/web",
  [INSIGHT_NAMES.SITE_SPEED]: "/web/web-vitals",
};
