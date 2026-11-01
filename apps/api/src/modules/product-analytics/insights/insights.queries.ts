import { ANALYTICS_EVENTS } from "@outfiqe/utils";

import {
  DIRECT_TRAFFIC_SOURCE,
  OWN_SITE_DOMAIN_SUFFIX,
  type SpeedDevice,
  type SpeedFilters,
  type SpeedPage,
  STAFF_CREATED_SIGNUP_METHOD,
  TOP_ROWS_LIMIT,
  WEEKLY_ACTIVE_WEEKS,
  ZERO_RESULT_SEARCHES_LIMIT,
} from "./insights.constants.js";

export const PAGEVIEW_EVENT = "$pageview";

const WEB_VITALS_EVENT = "$web_vitals";
const SPEED_PERCENTILES = [0.75, 0.9, 0.95, 0.99] as const;
const TYPICAL_VISIT_PERCENTILE = 0.75;
const WEB_VITAL_PROPERTIES = [
  "$web_vitals_LCP_value",
  "$web_vitals_INP_value",
  "$web_vitals_FCP_value",
  "$web_vitals_CLS_value",
] as const;
const MAIN_CONTENT_PROPERTY = "properties.$web_vitals_LCP_value";

const SPEED_DEVICE_CONDITION: Record<SpeedDevice, string> = {
  all: "",
  mobile: "AND toString(properties.$device_type) = 'Mobile'",
  desktop: "AND toString(properties.$device_type) = 'Desktop'",
};

const SPEED_PAGE_CONDITION: Record<SpeedPage, string> = {
  all: "",
  home: "AND toString(properties.$pathname) = '/'",
  products: "AND startsWith(toString(properties.$pathname), '/product/')",
  explore: "AND startsWith(toString(properties.$pathname), '/explore')",
};

const CURRENT_WEEK = 1;

export const PURCHASE_FUNNEL_EVENTS = [
  ANALYTICS_EVENTS.PRODUCT_DETAIL_VIEW,
  ANALYTICS_EVENTS.CART_ITEM_ADD,
  ANALYTICS_EVENTS.CHECKOUT_START,
  ANALYTICS_EVENTS.ORDER_SUBMIT,
  ANALYTICS_EVENTS.ORDER_PLACE,
] as const;

export const LOOK_TO_ORDER_EVENTS = [
  ANALYTICS_EVENTS.LOOK_DETAIL_VIEW,
  ANALYTICS_EVENTS.LOOK_PRODUCT_TAG_CLICK,
  ANALYTICS_EVENTS.PRODUCT_DETAIL_VIEW,
  ANALYTICS_EVENTS.CART_ITEM_ADD,
  ANALYTICS_EVENTS.ORDER_PLACE,
] as const;

const LOOK_ENGAGEMENT_EVENTS = [
  ANALYTICS_EVENTS.LOOK_DETAIL_VIEW,
  ANALYTICS_EVENTS.LOOK_PRODUCT_TAG_CLICK,
] as const;

const EXCLUDE_INTERNAL_PEOPLE = "coalesce(toString(person.properties.is_internal), '') != 'true'";

const EXCLUDE_NON_SHOPPERS = `${EXCLUDE_INTERNAL_PEOPLE}
    AND coalesce(toString(person.properties.is_brand_owner), '') != 'true'`;

const quoteEventNames = (eventNames: readonly string[]): string =>
  eventNames.map((eventName) => `'${eventName}'`).join(", ");

const withinLastDays = (days: number): string =>
  `timestamp >= now() - toIntervalDay(${Math.trunc(days)})`;

const ORDER_ID = "toString(properties.order_id)";

export const overviewQuery = (days: number): string => `
  SELECT
    uniqIf(person_id, event = '${PAGEVIEW_EVENT}'),
    uniqIf(distinct_id, event = '${ANALYTICS_EVENTS.USER_CREATE}'
      AND toString(properties.signup_method) != '${STAFF_CREATED_SIGNUP_METHOD}'),
    uniqIf(person_id, event = '${ANALYTICS_EVENTS.ORDER_PLACE}'),
    uniqIf(${ORDER_ID}, event = '${ANALYTICS_EVENTS.ORDER_PLACE}')
  FROM events
  WHERE ${withinLastDays(days)}
    AND event IN (${quoteEventNames([PAGEVIEW_EVENT, ANALYTICS_EVENTS.USER_CREATE, ANALYTICS_EVENTS.ORDER_PLACE])})
    AND ${EXCLUDE_INTERNAL_PEOPLE}`;

export const peopleReachingEachStepQuery = (
  days: number,
  stepEvents: readonly string[],
): string => `
  SELECT event, uniq(person_id)
  FROM events
  WHERE ${withinLastDays(days)}
    AND event IN (${quoteEventNames(stepEvents)})
    AND ${EXCLUDE_NON_SHOPPERS}
  GROUP BY event`;

export const lookViewersReachingEachStepQuery = (days: number): string => `
  SELECT event, uniq(person_id)
  FROM events
  WHERE ${withinLastDays(days)}
    AND event IN (${quoteEventNames(LOOK_TO_ORDER_EVENTS)})
    AND ${EXCLUDE_NON_SHOPPERS}
    AND person_id IN (
      SELECT person_id
      FROM events
      WHERE ${withinLastDays(days)}
        AND event IN (${quoteEventNames(LOOK_ENGAGEMENT_EVENTS)})
    )
  GROUP BY event`;

export const ordersByPaymentMethodQuery = (days: number): string => `
  SELECT toString(properties.payment_method) AS payment_method, uniq(${ORDER_ID}) AS orders
  FROM events
  WHERE ${withinLastDays(days)}
    AND event = '${ANALYTICS_EVENTS.ORDER_PLACE}'
    AND ${EXCLUDE_INTERNAL_PEOPLE}
  GROUP BY payment_method
  ORDER BY orders DESC`;

export const attributedOrdersQuery = (days: number): string => `
  SELECT uniq(${ORDER_ID})
  FROM events
  WHERE ${withinLastDays(days)}
    AND event = '${ANALYTICS_EVENTS.ORDER_PLACE}'
    AND toString(properties.has_creator_attribution) = 'true'
    AND ${EXCLUDE_INTERNAL_PEOPLE}`;

export const topCreatorsByLookViewsQuery = (days: number): string => `
  SELECT toString(properties.creator_id) AS creator_id, count()
  FROM events
  WHERE ${withinLastDays(days)}
    AND event = '${ANALYTICS_EVENTS.LOOK_DETAIL_VIEW}'
    AND ${EXCLUDE_INTERNAL_PEOPLE}
  GROUP BY creator_id
  ORDER BY count() DESC
  LIMIT ${TOP_ROWS_LIMIT}`;

export const trafficSourcesQuery = (days: number): string => `
  SELECT
    coalesce(nullIf(toString(properties.$referring_domain), ''), '${DIRECT_TRAFFIC_SOURCE}') AS source,
    uniq(person_id)
  FROM events
  WHERE ${withinLastDays(days)}
    AND event = '${PAGEVIEW_EVENT}'
    AND ${EXCLUDE_INTERNAL_PEOPLE}
  GROUP BY source
  HAVING source NOT LIKE '%${OWN_SITE_DOMAIN_SUFFIX}'
  ORDER BY uniq(person_id) DESC
  LIMIT ${TOP_ROWS_LIMIT}`;

export const campaignsQuery = (days: number): string => `
  SELECT toString(properties.utm_campaign) AS campaign, uniq(person_id)
  FROM events
  WHERE ${withinLastDays(days)}
    AND event = '${PAGEVIEW_EVENT}'
    AND coalesce(toString(properties.utm_campaign), '') != ''
    AND ${EXCLUDE_INTERNAL_PEOPLE}
  GROUP BY campaign
  ORDER BY uniq(person_id) DESC
  LIMIT ${TOP_ROWS_LIMIT}`;

export const creatorLinkClicksQuery = (days: number): string => `
  SELECT count()
  FROM events
  WHERE ${withinLastDays(days)}
    AND event = '${ANALYTICS_EVENTS.CREATOR_LINK_CLICK}'`;

export const weeklyActiveVisitorsQuery = (): string => `
  SELECT toString(toStartOfWeek(timestamp)) AS week_start, uniq(person_id)
  FROM events
  WHERE timestamp >= toStartOfWeek(now()) - toIntervalWeek(${WEEKLY_ACTIVE_WEEKS - CURRENT_WEEK})
    AND event = '${PAGEVIEW_EVENT}'
    AND ${EXCLUDE_INTERNAL_PEOPLE}
  GROUP BY week_start
  ORDER BY week_start`;

export const repeatBuyersQuery = (days: number): string => `
  SELECT
    uniq(person_id),
    uniqIf(person_id, toString(properties.is_first_order) = 'false')
  FROM events
  WHERE ${withinLastDays(days)}
    AND event = '${ANALYTICS_EVENTS.ORDER_PLACE}'
    AND ${EXCLUDE_INTERNAL_PEOPLE}`;

export const zeroResultSearchesQuery = (days: number): string => `
  SELECT toString(properties.search_query) AS search_query, count()
  FROM events
  WHERE ${withinLastDays(days)}
    AND event = '${ANALYTICS_EVENTS.SEARCH_QUERY_SUBMIT}'
    AND toString(properties.is_zero_result) = 'true'
    AND ${EXCLUDE_INTERNAL_PEOPLE}
  GROUP BY search_query
  ORDER BY count() DESC
  LIMIT ${ZERO_RESULT_SEARCHES_LIMIT}`;

const SESSION_ID = "properties.$session_id";

const pageviewsInRange = (days: number): string => `
  FROM events
  WHERE ${withinLastDays(days)}
    AND event = '${PAGEVIEW_EVENT}'
    AND ${EXCLUDE_INTERNAL_PEOPLE}`;

export const pageViewsAndSessionsQuery = (days: number): string => `
  SELECT count(), uniq(${SESSION_ID})
  ${pageviewsInRange(days)}`;

export const sessionQualityQuery = (days: number): string => `
  SELECT avg(duration), avg(bounced)
  FROM (
    SELECT
      ${SESSION_ID} AS session_id,
      any(session.$session_duration) AS duration,
      any(if(session.$is_bounce, 1, 0)) AS bounced
    ${pageviewsInRange(days)}
    GROUP BY session_id
  )`;

export const topPagesQuery = (days: number): string => `
  SELECT toString(properties.$pathname) AS path, count() AS views
  ${pageviewsInRange(days)}
  GROUP BY path
  ORDER BY views DESC
  LIMIT ${TOP_ROWS_LIMIT}`;

const pagesBySessionQuery = (days: number, sessionPageField: string): string => `
  SELECT toString(${sessionPageField}) AS path, uniq(${SESSION_ID}) AS sessions
  ${pageviewsInRange(days)}
  GROUP BY path
  ORDER BY sessions DESC
  LIMIT ${TOP_ROWS_LIMIT}`;

export const entryPagesQuery = (days: number): string =>
  pagesBySessionQuery(days, "session.$entry_pathname");

export const exitPagesQuery = (days: number): string =>
  pagesBySessionQuery(days, "session.$end_pathname");

const webVitalColumns = (property: string): string[] => [
  `countIf(properties.${property} IS NOT NULL)`,
  ...SPEED_PERCENTILES.map(
    (percentile) => `quantile(${percentile})(toFloat(properties.${property}))`,
  ),
];

const webVitalsInRange = (days: number, { device, page }: SpeedFilters): string => `
  FROM events
  WHERE ${withinLastDays(days)}
    AND event = '${WEB_VITALS_EVENT}'
    AND ${EXCLUDE_INTERNAL_PEOPLE}
    ${SPEED_DEVICE_CONDITION[device]}
    ${SPEED_PAGE_CONDITION[page]}`;

export const webVitalsQuery = (days: number, filters: SpeedFilters): string => `
  SELECT
    ${["count()", ...WEB_VITAL_PROPERTIES.flatMap(webVitalColumns)].join(",\n    ")}
  ${webVitalsInRange(days, filters)}`;

export const slowestPagesQuery = (days: number, filters: SpeedFilters): string => `
  SELECT
    toString(properties.$pathname) AS path,
    quantile(${TYPICAL_VISIT_PERCENTILE})(toFloat(${MAIN_CONTENT_PROPERTY})) AS typical_load,
    countIf(${MAIN_CONTENT_PROPERTY} IS NOT NULL)
  ${webVitalsInRange(days, filters)}
    AND ${MAIN_CONTENT_PROPERTY} IS NOT NULL
  GROUP BY path
  ORDER BY typical_load DESC
  LIMIT ${TOP_ROWS_LIMIT}`;
