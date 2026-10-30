import { ANALYTICS_EVENTS } from "@outfiqe/utils";

import {
  DIRECT_TRAFFIC_SOURCE,
  OWN_SITE_DOMAIN_SUFFIX,
  REPEAT_PURCHASE_MIN_ORDERS,
  TOP_ROWS_LIMIT,
  WEEKLY_ACTIVE_WEEKS,
  ZERO_RESULT_SEARCHES_LIMIT,
} from "./insights.constants.js";

export const PAGEVIEW_EVENT = "$pageview";

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

const quoteEventNames = (eventNames: readonly string[]): string =>
  eventNames.map((eventName) => `'${eventName}'`).join(", ");

const withinLastDays = (days: number): string =>
  `timestamp >= now() - toIntervalDay(${Math.trunc(days)})`;

export const overviewQuery = (days: number): string => `
  SELECT
    uniqIf(person_id, event = '${PAGEVIEW_EVENT}'),
    countIf(event = '${ANALYTICS_EVENTS.USER_CREATE}'),
    uniqIf(person_id, event = '${ANALYTICS_EVENTS.ORDER_PLACE}'),
    countIf(event = '${ANALYTICS_EVENTS.ORDER_PLACE}')
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
    AND ${EXCLUDE_INTERNAL_PEOPLE}
  GROUP BY event`;

export const lookViewersReachingEachStepQuery = (days: number): string => `
  SELECT event, uniq(person_id)
  FROM events
  WHERE ${withinLastDays(days)}
    AND event IN (${quoteEventNames(LOOK_TO_ORDER_EVENTS)})
    AND ${EXCLUDE_INTERNAL_PEOPLE}
    AND person_id IN (
      SELECT person_id
      FROM events
      WHERE ${withinLastDays(days)}
        AND event IN (${quoteEventNames(LOOK_ENGAGEMENT_EVENTS)})
    )
  GROUP BY event`;

export const ordersByPaymentMethodQuery = (days: number): string => `
  SELECT toString(properties.payment_method) AS payment_method, count()
  FROM events
  WHERE ${withinLastDays(days)}
    AND event = '${ANALYTICS_EVENTS.ORDER_PLACE}'
    AND ${EXCLUDE_INTERNAL_PEOPLE}
  GROUP BY payment_method
  ORDER BY count() DESC`;

export const attributedOrdersQuery = (days: number): string => `
  SELECT count()
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
  WHERE timestamp >= now() - toIntervalWeek(${WEEKLY_ACTIVE_WEEKS})
    AND event = '${PAGEVIEW_EVENT}'
    AND ${EXCLUDE_INTERNAL_PEOPLE}
  GROUP BY week_start
  ORDER BY week_start`;

export const repeatBuyersQuery = (days: number): string => `
  SELECT count(), countIf(order_count >= ${REPEAT_PURCHASE_MIN_ORDERS})
  FROM (
    SELECT person_id, count() AS order_count
    FROM events
    WHERE ${withinLastDays(days)}
      AND event = '${ANALYTICS_EVENTS.ORDER_PLACE}'
      AND ${EXCLUDE_INTERNAL_PEOPLE}
    GROUP BY person_id
  )`;

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
