export const ANALYTICS_SECTIONS = [
  { id: "analytics-overview", label: "Overview" },
  { id: "analytics-traffic", label: "Traffic" },
  { id: "analytics-purchases", label: "Purchases" },
  { id: "analytics-muses", label: "Muses" },
  { id: "analytics-sources", label: "Sources" },
  { id: "analytics-returning", label: "Coming back" },
  { id: "analytics-speed", label: "Site speed" },
  { id: "analytics-searches", label: "Failed searches" },
] as const;

export const SECTION_DESCRIPTION = {
  OVERVIEW: "How many people visited, joined and bought. Order and money totals are exact.",
  TRAFFIC:
    "How much people use the site, and which pages they start and finish on. Click a page to open it.",
  PURCHASES:
    "Follow shoppers from seeing a product to placing an order, and see where they give up.",
  MUSES:
    "Whether people who open a muse's look go on to buy what's tagged. Click a muse to see their profile.",
  SOURCES: "Which websites and campaigns sent people here. Click a website to open it.",
  RETURNING: "Visitors each week over the last 8 weeks, and how many buyers had ordered before.",
  SPEED:
    "How fast pages feel on real visitors' phones and computers. Choose how slow a visit to look at.",
  SEARCHES:
    "What shoppers searched for and couldn't find. These are ideas for what brands should stock. Click one to try it.",
} as const;

export const METRIC_HINT = {
  VISITORS:
    "Different people who opened any page in this period. One person visiting five times counts once. Staff are left out.",
  SIGN_UPS:
    "New accounts shoppers created themselves in this period. Accounts created by staff aren't counted.",
  BUYERS: "Different people who placed at least one order in this period.",
  VISITORS_WHO_BOUGHT:
    "Out of everyone who visited, the share who placed an order. If 100 people visit and 3 buy, this shows 3%.",
  ORDERS: "Every order paid for in the last 30 days, counted directly from the database.",
  ORDER_VALUE:
    "The total value of those orders, including delivery. It covers the last 30 days and comes directly from the database.",
  MUSE_ITEMS:
    "Out of all items ordered in the last 30 days, the share a shopper bought through a muse's look or link. Those muses earn commission.",
  PAGE_VIEWS: "Every time a page opened. One person reading five pages counts as five.",
  SESSIONS:
    "A session is one visit, from arriving on the site to leaving. One person coming back tomorrow counts as a new session.",
  AVERAGE_SESSION: "How long a visit lasts on average, from the first page to the last.",
  BOUNCE_RATE:
    "The share of visits where someone opened one page and left without doing anything else. Lower is better.",
  ORDERS_CREDITED:
    "Orders where a shopper reached the product through a muse's look or link in this period.",
  MUSE_LINK_CLICKS: "How many times people opened a product link that a muse shared.",
  BUYERS_IN_RANGE: "Different people who placed at least one order in this period.",
  RETURNING_BUYERS:
    "The share of this period's buyers who had already ordered at least once before.",
  MAIN_CONTENT:
    "How long until the biggest thing on the page, usually a photo, can be seen. This is when a page feels loaded. Google's aim is under 2.5 seconds.",
  FIRST_CONTENT:
    "How long until anything at all appears after opening a page. Until then the visitor sees a blank screen. Google's aim is under 1.8 seconds.",
  TAP_RESPONSE:
    "How long the page takes to react after someone taps or clicks. Over 200 milliseconds starts to feel slow.",
  LAYOUT_JUMPING:
    "How much the page moves around while loading, which makes people tap the wrong thing. It's a score, not a time, and lower is better. Under 0.1 is good.",
} as const;

export const FUNNEL_FIRST_STEP_NOTE = "Everyone in this funnel starts here.";

export const SPEED_PERCENTILES = ["p75", "p90", "p95", "p99"] as const;
export type SpeedPercentile = (typeof SPEED_PERCENTILES)[number];

export const SPEED_PERCENTILE_LABEL: Record<SpeedPercentile, string> = {
  p75: "Typical visit (P75)",
  p90: "Slow visits (P90)",
  p95: "Very slow (P95)",
  p99: "Worst visits (P99)",
};

export const SPEED_PERCENTILE_EXPLANATION: Record<SpeedPercentile, string> = {
  p75: "3 in 4 visits were this fast or faster. This is the number Google judges a site on.",
  p90: "9 in 10 visits were this fast or faster. This shows how slow visits feel.",
  p95: "19 in 20 visits were this fast or faster. This shows the slow end.",
  p99: "99 in 100 visits were this fast or faster. Usually weak phones or bad connections.",
};

export const SPEED_DEVICES = ["all", "mobile", "desktop"] as const;
export type SpeedDevice = (typeof SPEED_DEVICES)[number];

export const SPEED_DEVICE_LABEL: Record<SpeedDevice, string> = {
  all: "All devices",
  mobile: "Phones",
  desktop: "Computers",
};

export const SPEED_PAGES = ["all", "home", "products", "explore"] as const;
export type SpeedPage = (typeof SPEED_PAGES)[number];

export const SPEED_PAGE_LABEL: Record<SpeedPage, string> = {
  all: "All pages",
  home: "Homepage",
  products: "Product pages",
  explore: "Explore",
};

export const MIN_READINGS_TO_RATE = 10;
