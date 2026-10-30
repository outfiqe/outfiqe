import logger from "#lib/winston.utils.js";
import { cacheService } from "#redis/cache.service.js";
import { describeError } from "#redis/redis.utils.js";

import {
  DAYS_IN_INSIGHT_RANGE,
  FRESH_INSIGHT_TTL_SECONDS,
  INSIGHT_NAMES,
  INSIGHT_STATUS,
  type InsightName,
  type InsightRange,
  LAST_GOOD_INSIGHT_TTL_SECONDS,
  POSTHOG_PATH_BY_INSIGHT,
} from "./insights.constants.js";
import { findPosthogQueryConnection, runPosthogQuery } from "./insights.posthog-query.js";
import {
  attributedOrdersQuery,
  campaignsQuery,
  creatorLinkClicksQuery,
  entryPagesQuery,
  exitPagesQuery,
  LOOK_TO_ORDER_EVENTS,
  lookViewersReachingEachStepQuery,
  ordersByPaymentMethodQuery,
  overviewQuery,
  pageViewsAndSessionsQuery,
  peopleReachingEachStepQuery,
  PURCHASE_FUNNEL_EVENTS,
  repeatBuyersQuery,
  sessionQualityQuery,
  topCreatorsByLookViewsQuery,
  topPagesQuery,
  trafficSourcesQuery,
  webVitalsQuery,
  weeklyActiveVisitorsQuery,
  zeroResultSearchesQuery,
} from "./insights.queries.js";
import { productAnalyticsInsightsRepository } from "./insights.repository.js";
import type {
  AcquisitionInsight,
  CachedInsight,
  InsightResult,
  LookToOrderInsight,
  OverviewInsight,
  PosthogQueryConnection,
  PurchaseFunnelInsight,
  RankedPage,
  RetentionInsight,
  SiteSpeedInsight,
  SiteTrafficInsight,
  ZeroResultSearchesInsight,
} from "./insights.types.js";
import {
  type LabelledCount,
  readCountAt,
  readFirstRowCounts,
  readFirstRowMeasurements,
  readLabelledCounts,
  toFunnelSteps,
  toProductIdFromPath,
  toShare,
} from "./insights.utils.js";

const OVERVIEW_COLUMN = { VISITORS: 0, SIGNUPS: 1, BUYERS: 2, ORDERS: 3 } as const;
const REPEAT_BUYERS_COLUMN = { BUYERS: 0, REPEAT_BUYERS: 1 } as const;
const PAGE_VIEWS_COLUMN = { PAGE_VIEWS: 0, SESSIONS: 1 } as const;
const SESSION_QUALITY_COLUMN = { AVERAGE_SECONDS: 0, BOUNCE_RATE: 1 } as const;
const WEB_VITALS_COLUMN = { MEASUREMENTS: 0, LCP: 1, INP: 2, FCP: 3, CLS: 4 } as const;
const FIRST_COLUMN = 0;
const NO_MEASUREMENTS = 0;

type InsightBuilder<Insight> = (
  connection: PosthogQueryConnection,
  days: number,
) => Promise<Insight>;

const insightCacheKey = (
  cacheKind: "fresh" | "last-good",
  name: InsightName,
  range: InsightRange,
) => `product-analytics:insight:${cacheKind}:${name}:${range}`;

const readCachedInsight = async <Insight>(key: string): Promise<CachedInsight<Insight> | null> => {
  try {
    return await cacheService.get<CachedInsight<Insight>>(key);
  } catch (error) {
    logger.warn(`Product analytics cache read ${key} failed: ${describeError(error)}`);
    return null;
  }
};

const writeCachedInsight = async <Insight>(
  key: string,
  cachedInsight: CachedInsight<Insight>,
  ttlSeconds: number,
): Promise<void> => {
  try {
    await cacheService.set(key, cachedInsight, ttlSeconds);
  } catch (error) {
    logger.warn(`Product analytics cache write ${key} failed: ${describeError(error)}`);
  }
};

const toPosthogUrl = ({ appHost, projectId }: PosthogQueryConnection, name: InsightName) =>
  new URL(`/project/${projectId}${POSTHOG_PATH_BY_INSIGHT[name]}`, appHost).toString();

const loadInsight = async <Insight>(
  name: InsightName,
  range: InsightRange,
  buildInsight: InsightBuilder<Insight>,
): Promise<InsightResult<Insight>> => {
  const connection = findPosthogQueryConnection();
  if (!connection) {
    return {
      status: INSIGHT_STATUS.NOT_CONNECTED,
      refreshedAt: null,
      posthogUrl: null,
      insight: null,
    };
  }

  const posthogUrl = toPosthogUrl(connection, name);
  const freshKey = insightCacheKey("fresh", name, range);
  const lastGoodKey = insightCacheKey("last-good", name, range);

  const freshInsight = await readCachedInsight<Insight>(freshKey);
  if (freshInsight) return { status: INSIGHT_STATUS.FRESH, posthogUrl, ...freshInsight };

  try {
    const insight = await buildInsight(connection, DAYS_IN_INSIGHT_RANGE[range]);
    const cachedInsight = { insight, refreshedAt: new Date().toISOString() };
    await writeCachedInsight(freshKey, cachedInsight, FRESH_INSIGHT_TTL_SECONDS);
    await writeCachedInsight(lastGoodKey, cachedInsight, LAST_GOOD_INSIGHT_TTL_SECONDS);
    return { status: INSIGHT_STATUS.FRESH, posthogUrl, ...cachedInsight };
  } catch (error) {
    logger.error(`Product analytics insight ${name} (${range}) failed: ${describeError(error)}`);
    const lastGoodInsight = await readCachedInsight<Insight>(lastGoodKey);
    if (lastGoodInsight) return { status: INSIGHT_STATUS.STALE, posthogUrl, ...lastGoodInsight };
    return { status: INSIGHT_STATUS.UNAVAILABLE, refreshedAt: null, posthogUrl, insight: null };
  }
};

const buildOverview: InsightBuilder<OverviewInsight> = async (connection, days) => {
  const counts = readFirstRowCounts(
    await runPosthogQuery(connection, INSIGHT_NAMES.OVERVIEW, overviewQuery(days)),
  );
  const visitors = readCountAt(counts, OVERVIEW_COLUMN.VISITORS);
  const buyers = readCountAt(counts, OVERVIEW_COLUMN.BUYERS);
  return {
    visitors,
    signups: readCountAt(counts, OVERVIEW_COLUMN.SIGNUPS),
    buyers,
    orders: readCountAt(counts, OVERVIEW_COLUMN.ORDERS),
    visitToBuyerRate: toShare(buyers, visitors),
  };
};

const buildPurchaseFunnel: InsightBuilder<PurchaseFunnelInsight> = async (connection, days) => {
  const stepRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.PURCHASE_FUNNEL}:steps`,
    peopleReachingEachStepQuery(days, PURCHASE_FUNNEL_EVENTS),
  );
  const paymentRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.PURCHASE_FUNNEL}:payment-methods`,
    ordersByPaymentMethodQuery(days),
  );
  return {
    steps: toFunnelSteps(PURCHASE_FUNNEL_EVENTS, stepRows),
    ordersByPaymentMethod: readLabelledCounts(paymentRows).map(({ label, count }) => ({
      paymentMethod: label,
      orders: count,
    })),
  };
};

const buildLookToOrder: InsightBuilder<LookToOrderInsight> = async (connection, days) => {
  const stepRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.LOOK_TO_ORDER}:steps`,
    lookViewersReachingEachStepQuery(days),
  );
  const attributedRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.LOOK_TO_ORDER}:attributed-orders`,
    attributedOrdersQuery(days),
  );
  const creatorRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.LOOK_TO_ORDER}:top-creators`,
    topCreatorsByLookViewsQuery(days),
  );
  const creatorLookViews = readLabelledCounts(creatorRows);
  const creatorNames = await productAnalyticsInsightsRepository.findCreatorNames(
    creatorLookViews.map(({ label }) => label),
  );
  const creatorNameById = new Map(creatorNames.map((creator) => [creator.id, creator]));
  return {
    steps: toFunnelSteps(LOOK_TO_ORDER_EVENTS, stepRows),
    attributedOrders: readCountAt(readFirstRowCounts(attributedRows), FIRST_COLUMN),
    topCreatorsByLookViews: creatorLookViews.map(({ label, count }) => ({
      creatorId: label,
      creatorName: creatorNameById.get(label)?.name ?? null,
      creatorHandle: creatorNameById.get(label)?.handle ?? null,
      lookViews: count,
    })),
  };
};

const buildAcquisition: InsightBuilder<AcquisitionInsight> = async (connection, days) => {
  const sourceRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.ACQUISITION}:sources`,
    trafficSourcesQuery(days),
  );
  const campaignRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.ACQUISITION}:campaigns`,
    campaignsQuery(days),
  );
  const linkClickRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.ACQUISITION}:creator-link-clicks`,
    creatorLinkClicksQuery(days),
  );
  return {
    sources: readLabelledCounts(sourceRows).map(({ label, count }) => ({
      source: label,
      visitors: count,
    })),
    campaigns: readLabelledCounts(campaignRows).map(({ label, count }) => ({
      campaign: label,
      visitors: count,
    })),
    creatorLinkClicks: readCountAt(readFirstRowCounts(linkClickRows), FIRST_COLUMN),
  };
};

const buildRetention: InsightBuilder<RetentionInsight> = async (connection, days) => {
  const weeklyRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.RETENTION}:weekly-active`,
    weeklyActiveVisitorsQuery(),
  );
  const repeatRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.RETENTION}:repeat-buyers`,
    repeatBuyersQuery(days),
  );
  const repeatCounts = readFirstRowCounts(repeatRows);
  const buyers = readCountAt(repeatCounts, REPEAT_BUYERS_COLUMN.BUYERS);
  const repeatBuyers = readCountAt(repeatCounts, REPEAT_BUYERS_COLUMN.REPEAT_BUYERS);
  return {
    weeklyActiveVisitors: readLabelledCounts(weeklyRows).map(({ label, count }) => ({
      weekStart: label,
      visitors: count,
    })),
    buyers,
    repeatBuyers,
    repeatPurchaseRate: toShare(repeatBuyers, buyers),
  };
};

const buildZeroResultSearches: InsightBuilder<ZeroResultSearchesInsight> = async (
  connection,
  days,
) => {
  const searchRows = await runPosthogQuery(
    connection,
    INSIGHT_NAMES.ZERO_RESULT_SEARCHES,
    zeroResultSearchesQuery(days),
  );
  return {
    searches: readLabelledCounts(searchRows).map(({ label, count }) => ({
      query: label,
      searchCount: count,
    })),
  };
};

const findProductNameById = async (pages: LabelledCount[]): Promise<Map<string, string>> => {
  const productIds = pages.flatMap(({ label }) => toProductIdFromPath(label) ?? []);
  const productNames = await productAnalyticsInsightsRepository.findProductNames([
    ...new Set(productIds),
  ]);
  return new Map(productNames.map(({ id, name }) => [id, name]));
};

const toRankedPages = (
  pages: LabelledCount[],
  productNameById: Map<string, string>,
): RankedPage[] =>
  pages.map(({ label, count }) => ({
    path: label,
    productName: productNameById.get(toProductIdFromPath(label) ?? "") ?? null,
    count,
  }));

const buildSiteTraffic: InsightBuilder<SiteTrafficInsight> = async (connection, days) => {
  const pageViewRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.SITE_TRAFFIC}:page-views`,
    pageViewsAndSessionsQuery(days),
  );
  const sessionRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.SITE_TRAFFIC}:session-quality`,
    sessionQualityQuery(days),
  );
  const topPageRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.SITE_TRAFFIC}:top-pages`,
    topPagesQuery(days),
  );
  const entryPageRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.SITE_TRAFFIC}:entry-pages`,
    entryPagesQuery(days),
  );
  const exitPageRows = await runPosthogQuery(
    connection,
    `${INSIGHT_NAMES.SITE_TRAFFIC}:exit-pages`,
    exitPagesQuery(days),
  );

  const pageViewCounts = readFirstRowCounts(pageViewRows);
  const sessionCounts = readFirstRowCounts(sessionRows);
  const topPages = readLabelledCounts(topPageRows);
  const entryPages = readLabelledCounts(entryPageRows);
  const exitPages = readLabelledCounts(exitPageRows);
  const productNameById = await findProductNameById([...topPages, ...entryPages, ...exitPages]);

  return {
    pageViews: readCountAt(pageViewCounts, PAGE_VIEWS_COLUMN.PAGE_VIEWS),
    sessions: readCountAt(pageViewCounts, PAGE_VIEWS_COLUMN.SESSIONS),
    averageSessionSeconds: readCountAt(sessionCounts, SESSION_QUALITY_COLUMN.AVERAGE_SECONDS),
    bounceRate: readCountAt(sessionCounts, SESSION_QUALITY_COLUMN.BOUNCE_RATE),
    topPages: toRankedPages(topPages, productNameById),
    entryPages: toRankedPages(entryPages, productNameById),
    exitPages: toRankedPages(exitPages, productNameById),
  };
};

const buildSiteSpeed: InsightBuilder<SiteSpeedInsight> = async (connection, days) => {
  const measurements = readFirstRowMeasurements(
    await runPosthogQuery(connection, INSIGHT_NAMES.SITE_SPEED, webVitalsQuery(days)),
  );
  return {
    measurementCount: measurements[WEB_VITALS_COLUMN.MEASUREMENTS] ?? NO_MEASUREMENTS,
    largestContentfulPaintMs: measurements[WEB_VITALS_COLUMN.LCP] ?? null,
    interactionToNextPaintMs: measurements[WEB_VITALS_COLUMN.INP] ?? null,
    firstContentfulPaintMs: measurements[WEB_VITALS_COLUMN.FCP] ?? null,
    cumulativeLayoutShift: measurements[WEB_VITALS_COLUMN.CLS] ?? null,
  };
};

export const productAnalyticsInsightsService = {
  overview: (range: InsightRange) => loadInsight(INSIGHT_NAMES.OVERVIEW, range, buildOverview),
  purchaseFunnel: (range: InsightRange) =>
    loadInsight(INSIGHT_NAMES.PURCHASE_FUNNEL, range, buildPurchaseFunnel),
  lookToOrder: (range: InsightRange) =>
    loadInsight(INSIGHT_NAMES.LOOK_TO_ORDER, range, buildLookToOrder),
  acquisition: (range: InsightRange) =>
    loadInsight(INSIGHT_NAMES.ACQUISITION, range, buildAcquisition),
  retention: (range: InsightRange) => loadInsight(INSIGHT_NAMES.RETENTION, range, buildRetention),
  zeroResultSearches: (range: InsightRange) =>
    loadInsight(INSIGHT_NAMES.ZERO_RESULT_SEARCHES, range, buildZeroResultSearches),
  siteTraffic: (range: InsightRange) =>
    loadInsight(INSIGHT_NAMES.SITE_TRAFFIC, range, buildSiteTraffic),
  siteSpeed: (range: InsightRange) => loadInsight(INSIGHT_NAMES.SITE_SPEED, range, buildSiteSpeed),
};
