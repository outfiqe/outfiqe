import type { ProductType } from "#generated/prisma/enums.js";

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

const HOUR_MS = 60 * 60 * 1000;

export const truncateToHour = (date: Date): Date => {
  const truncated = new Date(date);
  truncated.setMinutes(0, 0, 0);
  return truncated;
};

export const ageHoursOf = (bucket: { bucketStart: Date }, now: Date): number =>
  (now.getTime() - bucket.bucketStart.getTime()) / HOUR_MS;

export const decayWeight = (ageHours: number): number =>
  Math.exp(-ageHours / DECAY_HALF_LIFE_HOURS);

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
): number => {
  let total = 0;
  for (const bucket of buckets) {
    const ageHours = ageHoursOf(bucket, now);
    if (ageHours < windowStartHoursAgo || ageHours >= windowEndHoursAgo) continue;
    total += bucketActivity(bucket) * decayWeight(ageHours);
  }
  return total;
};

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
): { average: number; nonEmptyWindows: number } => {
  const totalHours = windowDays * 24;
  const windowSums = new Map<number, number>();

  for (const bucket of buckets) {
    const ageHours = ageHoursOf(bucket, now);
    if (ageHours < 0 || ageHours >= totalHours) continue;
    const activity = bucketActivity(bucket);
    if (activity <= 0) continue;
    const windowIndex = Math.floor(ageHours / BASELINE_WINDOW_HOURS);
    windowSums.set(windowIndex, (windowSums.get(windowIndex) ?? 0) + activity);
  }

  const nonEmptyWindows = windowSums.size;
  if (nonEmptyWindows === 0) return { average: 0, nonEmptyWindows };

  const total = [...windowSums.values()].reduce((sum, value) => sum + value, 0);
  return { average: total / nonEmptyWindows, nonEmptyWindows };
};

export const computeGroupBaselines = (
  bucketsByProduct: Map<string, MetricBucket[]>,
  metaById: Map<string, ProductTrendMeta>,
  now: Date,
  windowDays: number,
): { byType: Map<ProductType, number>; global: number } => {
  const averagesByType = new Map<ProductType, number[]>();
  const allAverages: number[] = [];

  for (const [productId, buckets] of bucketsByProduct) {
    const meta = metaById.get(productId);
    if (!meta) continue;

    const { average, nonEmptyWindows } = computeOwnBaseline(buckets, now, windowDays);
    if (nonEmptyWindows === 0) continue;

    allAverages.push(average);
    const existing = averagesByType.get(meta.type);
    if (existing) existing.push(average);
    else averagesByType.set(meta.type, [average]);
  }

  const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

  const byType = new Map<ProductType, number>();
  for (const [type, averages] of averagesByType) byType.set(type, mean(averages));

  return { byType, global: allAverages.length > 0 ? mean(allAverages) : 0 };
};

export const isWithinFreshnessWindow = (createdAt: Date, now: Date): boolean =>
  now.getTime() - createdAt.getTime() <= FRESHNESS_WINDOW_MS;

export const pickBaseline = (
  productType: ProductType,
  ownBaseline: { average: number; nonEmptyWindows: number },
  categoryBaselines: Map<ProductType, number>,
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
  productType: ProductType;
  categoryBaselines: Map<ProductType, number>;
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

export const applyDiversity = <T extends { brandId: string }>(
  candidates: T[],
  limit: number,
  maxPerBrand: number,
): T[] => {
  const brandCounts = new Map<string, number>();
  const picked: T[] = [];
  for (const candidate of candidates) {
    if (picked.length >= limit) break;
    const used = brandCounts.get(candidate.brandId) ?? 0;
    if (used >= maxPerBrand) continue;
    picked.push(candidate);
    brandCounts.set(candidate.brandId, used + 1);
  }
  return picked;
};

const mulberry32 = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const weightedShuffle = <T extends { score: number }>(items: T[], rng: () => number): T[] => {
  const pool = [...items];
  const picked: T[] = [];
  while (pool.length > 0) {
    const totalWeight = pool.reduce((sum, item) => sum + item.score, 0);
    let remaining = rng() * totalWeight;
    let pickedIndex = pool.length - 1;
    for (const [index, item] of pool.entries()) {
      remaining -= item.score;
      if (remaining <= 0) {
        pickedIndex = index;
        break;
      }
    }
    const [chosen] = pool.splice(pickedIndex, 1);
    if (chosen) picked.push(chosen);
  }
  return picked;
};

export const applyWeightedRotation = <T extends { score: number }>(
  candidates: T[],
  tieBandRatio: number,
  seed: number,
): T[] => {
  const rng = mulberry32(seed);
  const result: T[] = [];
  let index = 0;
  while (index < candidates.length) {
    const bandLeader = candidates[index];
    if (!bandLeader) break;
    const bandThreshold = bandLeader.score * (1 - tieBandRatio);
    let end = index;
    while (end < candidates.length && (candidates[end]?.score ?? -Infinity) >= bandThreshold) {
      end += 1;
    }
    result.push(...weightedShuffle(candidates.slice(index, end), rng));
    index = end;
  }
  return result;
};
