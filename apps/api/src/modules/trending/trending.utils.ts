import {
  ageHoursOf,
  applyDiversity as applyGroupDiversity,
  applyWeightedRotation,
  computeOwnBaseline as computeOwnBaselineGeneric,
  meanOf,
  sumDecayedActivityInWindow as sumDecayedActivityInWindowGeneric,
  truncateToHour,
} from "#lib/trend-scoring.utils.js";

import {
  BASELINE_WINDOW_DAYS,
  BASELINE_WINDOW_HOURS,
  CURRENT_WINDOW_END_HOURS,
  CURRENT_WINDOW_START_HOURS,
  DECAY_HALF_LIFE_HOURS,
  FRESHNESS_MULTIPLIER,
  FRESHNESS_WINDOW_MS,
  MIN_BUCKETS_FOR_OWN_BASELINE,
  MOMENTUM_CAP,
  PREVIOUS_WINDOW_END_HOURS,
  PREVIOUS_WINDOW_START_HOURS,
  SIGNAL_WEIGHTS,
  SMOOTHING,
} from "./trending.constants.js";
import type {
  BaselineSource,
  MetricBucket,
  ProductScoreBreakdown,
  ProductTrendMeta,
} from "./trending.types.js";

export { ageHoursOf, applyWeightedRotation, truncateToHour };

export const applyDiversity = <T extends { brandId: string }>(
  candidates: T[],
  limit: number,
  maxPerBrand: number,
): T[] => applyGroupDiversity(candidates, limit, maxPerBrand, (candidate) => candidate.brandId);

export const bucketActivity = (bucket: {
  purchaseUnits: number;
  cartAdds: number;
  saves: number;
  creatorTags: number;
  tagClicks: number;
}): number =>
  SIGNAL_WEIGHTS.purchaseUnits * Math.log1p(bucket.purchaseUnits) +
  SIGNAL_WEIGHTS.cartAdds * Math.log1p(bucket.cartAdds) +
  SIGNAL_WEIGHTS.saves * Math.log1p(bucket.saves) +
  SIGNAL_WEIGHTS.creatorTags * Math.log1p(bucket.creatorTags) +
  SIGNAL_WEIGHTS.tagClicks * Math.log1p(bucket.tagClicks);

export const groupBucketsByProduct = (buckets: MetricBucket[]): Map<string, MetricBucket[]> => {
  const grouped = new Map<string, MetricBucket[]>();
  for (const bucket of buckets) {
    const existing = grouped.get(bucket.productId);
    if (existing) existing.push(bucket);
    else grouped.set(bucket.productId, [bucket]);
  }
  return grouped;
};

export const sumDecayedActivityInWindow = (
  buckets: MetricBucket[],
  now: Date,
  windowStartHoursAgo: number,
  windowEndHoursAgo: number,
): number =>
  sumDecayedActivityInWindowGeneric(
    buckets,
    now,
    windowStartHoursAgo,
    windowEndHoursAgo,
    DECAY_HALF_LIFE_HOURS,
    bucketActivity,
  );

export const sumRawActivityInWindow = (
  buckets: MetricBucket[],
  now: Date,
  windowStartHoursAgo: number,
  windowEndHoursAgo: number,
): ProductScoreBreakdown["recentActivity"] => {
  const totals = { purchaseUnits: 0, cartAdds: 0, saves: 0, creatorTags: 0, tagClicks: 0 };
  for (const bucket of buckets) {
    const ageHours = ageHoursOf(bucket, now);
    if (ageHours < windowStartHoursAgo || ageHours >= windowEndHoursAgo) continue;
    totals.purchaseUnits += bucket.purchaseUnits;
    totals.cartAdds += bucket.cartAdds;
    totals.saves += bucket.saves;
    totals.creatorTags += bucket.creatorTags;
    totals.tagClicks += bucket.tagClicks;
  }
  return totals;
};

export const computeOwnBaseline = (
  buckets: MetricBucket[],
  now: Date,
  windowDays: number,
): { average: number; nonEmptyWindows: number } =>
  computeOwnBaselineGeneric(buckets, now, windowDays, BASELINE_WINDOW_HOURS, bucketActivity);

export const computeGroupBaselines = (
  bucketsByProduct: Map<string, MetricBucket[]>,
  metaById: Map<string, ProductTrendMeta>,
  now: Date,
  windowDays: number,
): { byType: Map<string, number>; global: number } => {
  const averagesByType = new Map<string, number[]>();
  const allAverages: number[] = [];

  for (const [productId, buckets] of bucketsByProduct) {
    const meta = metaById.get(productId);
    if (!meta) continue;

    const { average, nonEmptyWindows } = computeOwnBaseline(buckets, now, windowDays);
    if (nonEmptyWindows === 0) continue;

    allAverages.push(average);
    const existing = averagesByType.get(meta.productTypeId);
    if (existing) existing.push(average);
    else averagesByType.set(meta.productTypeId, [average]);
  }

  const byType = new Map<string, number>();
  for (const [type, averages] of averagesByType) byType.set(type, meanOf(averages));

  return { byType, global: meanOf(allAverages) };
};

export const isWithinFreshnessWindow = (createdAt: Date, now: Date): boolean =>
  now.getTime() - createdAt.getTime() <= FRESHNESS_WINDOW_MS;

export const pickBaseline = (
  productType: string,
  ownBaseline: { average: number; nonEmptyWindows: number },
  categoryBaselines: Map<string, number>,
  globalBaseline: number,
): { source: BaselineSource; value: number } => {
  if (ownBaseline.nonEmptyWindows >= MIN_BUCKETS_FOR_OWN_BASELINE) {
    return { source: "product", value: ownBaseline.average };
  }
  const categoryBaseline = categoryBaselines.get(productType);
  if (categoryBaseline !== undefined && categoryBaseline > 0) {
    return { source: "category", value: categoryBaseline };
  }
  return { source: "global", value: globalBaseline };
};

export const scoreProduct = (params: {
  productId: string;
  brandId: string;
  buckets: MetricBucket[];
  productCreatedAt: Date;
  productType: string;
  categoryBaselines: Map<string, number>;
  globalBaseline: number;
  now: Date;
}): ProductScoreBreakdown => {
  const {
    productId,
    brandId,
    buckets,
    productCreatedAt,
    productType,
    categoryBaselines,
    globalBaseline,
    now,
  } = params;

  const decayedActivity = sumDecayedActivityInWindow(
    buckets,
    now,
    CURRENT_WINDOW_START_HOURS,
    CURRENT_WINDOW_END_HOURS,
  );
  const previousWindowActivity = sumDecayedActivityInWindow(
    buckets,
    now,
    PREVIOUS_WINDOW_START_HOURS,
    PREVIOUS_WINDOW_END_HOURS,
  );
  const recentActivity = sumRawActivityInWindow(
    buckets,
    now,
    CURRENT_WINDOW_START_HOURS,
    CURRENT_WINDOW_END_HOURS,
  );

  const ownBaseline = computeOwnBaseline(buckets, now, BASELINE_WINDOW_DAYS);
  const baseline = pickBaseline(productType, ownBaseline, categoryBaselines, globalBaseline);

  const velocity = decayedActivity / (previousWindowActivity + SMOOTHING);
  const baselineLift = decayedActivity / (baseline.value + SMOOTHING);
  const momentum = Math.min(Math.sqrt(velocity * baselineLift), MOMENTUM_CAP);
  const freshnessMultiplier = isWithinFreshnessWindow(productCreatedAt, now)
    ? FRESHNESS_MULTIPLIER
    : 1;
  const score = decayedActivity * momentum * freshnessMultiplier;

  return {
    productId,
    brandId,
    recentActivity,
    decayedActivity,
    previousWindowActivity,
    velocity,
    baseline,
    baselineLift,
    momentum,
    freshnessMultiplier,
    score,
  };
};
