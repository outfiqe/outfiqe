import { ageHoursOf, decayWeight } from "#lib/trend-scoring.utils.js";

import {
  TREND_BASELINE_WINDOW_DAYS,
  TREND_BASELINE_WINDOW_HOURS,
  TREND_CURRENT_WINDOW_END_HOURS,
  TREND_CURRENT_WINDOW_START_HOURS,
  TREND_DECAY_HALF_LIFE_HOURS,
  TREND_FRESHNESS_MULTIPLIER,
  TREND_FRESHNESS_WINDOW_MS,
  TREND_MIN_BUCKETS_FOR_OWN_BASELINE,
  TREND_MOMENTUM_CAP,
  TREND_PREVIOUS_WINDOW_END_HOURS,
  TREND_PREVIOUS_WINDOW_START_HOURS,
  TREND_SIGNAL_WEIGHTS,
  TREND_SMOOTHING,
} from "./creatorLook.constants.js";
import type {
  CreatorLookEditDetail,
  CreatorLookSummary,
  PostBaselineSource,
  PostMetricBucket,
  PostScoreBreakdown,
} from "./creatorLook.types.js";

export const toSummary = ({
  id,
  creatorId,
  imageUrl,
  caption,
  createdAt,
  taggedProducts,
}: {
  id: string;
  creatorId: string;
  imageUrl: string;
  caption: string | null;
  createdAt: Date;
} & {
  taggedProducts: { product: { id: string; name: string; imageUrl: string | null } }[];
}): CreatorLookSummary => ({
  id,
  creatorId,
  imageUrl,
  caption,
  createdAt,
  taggedProducts: taggedProducts.map((tagged) => tagged.product),
});

export const toEditDetail = ({
  id,
  imageUrl,
  images,
  caption,
  taggedProducts,
}: {
  id: string;
  imageUrl: string;
  images: { url: string }[];
  caption: string | null;
  taggedProducts: {
    productId: string;
    sizeWorn: string | null;
    product: {
      id: string;
      name: string;
      price: number;
      imageUrl: string | null;
      brand: { name: string };
    };
  }[];
}): CreatorLookEditDetail => ({
  id,
  imageUrls: images.length > 0 ? images.map((image) => image.url) : [imageUrl],
  caption,
  taggedProducts: taggedProducts.map(({ productId, sizeWorn, product }) => ({
    productId,
    sizeWorn: sizeWorn ?? "",
    product: {
      id: product.id,
      name: product.name,
      brand: product.brand.name,
      price: product.price,
      imageUrl: product.imageUrl,
    },
  })),
});

export type SimpleCursor = { c: string; i: string };
export type TrendingSnapshotCursor = { sessionId: string; offset: number };
export type FeaturedLookCursor = { e: number; i: string };

export const postBucketActivity = (bucket: {
  likes: number;
  comments: number;
  saves: number;
  tagClicks: number;
}): number =>
  TREND_SIGNAL_WEIGHTS.likes * Math.log1p(bucket.likes) +
  TREND_SIGNAL_WEIGHTS.comments * Math.log1p(bucket.comments) +
  TREND_SIGNAL_WEIGHTS.saves * Math.log1p(bucket.saves) +
  TREND_SIGNAL_WEIGHTS.tagClicks * Math.log1p(bucket.tagClicks);

export const groupPostBucketsByLook = (
  buckets: PostMetricBucket[],
): Map<string, PostMetricBucket[]> => {
  const grouped = new Map<string, PostMetricBucket[]>();
  for (const bucket of buckets) {
    const existing = grouped.get(bucket.lookId);
    if (existing) existing.push(bucket);
    else grouped.set(bucket.lookId, [bucket]);
  }
  return grouped;
};

const sumDecayedPostActivityInWindow = (
  buckets: PostMetricBucket[],
  now: Date,
  windowStartHoursAgo: number,
  windowEndHoursAgo: number,
): number => {
  let total = 0;
  for (const bucket of buckets) {
    const ageHours = ageHoursOf(bucket, now);
    if (ageHours < windowStartHoursAgo || ageHours >= windowEndHoursAgo) continue;
    total += postBucketActivity(bucket) * decayWeight(ageHours, TREND_DECAY_HALF_LIFE_HOURS);
  }
  return total;
};

const sumRawPostActivityInWindow = (
  buckets: PostMetricBucket[],
  now: Date,
  windowStartHoursAgo: number,
  windowEndHoursAgo: number,
): PostScoreBreakdown["recentActivity"] => {
  const totals = { likes: 0, comments: 0, saves: 0, tagClicks: 0 };
  for (const bucket of buckets) {
    const ageHours = ageHoursOf(bucket, now);
    if (ageHours < windowStartHoursAgo || ageHours >= windowEndHoursAgo) continue;
    totals.likes += bucket.likes;
    totals.comments += bucket.comments;
    totals.saves += bucket.saves;
    totals.tagClicks += bucket.tagClicks;
  }
  return totals;
};

export const computeOwnPostBaseline = (
  buckets: PostMetricBucket[],
  now: Date,
  windowDays: number,
): { average: number; nonEmptyWindows: number } => {
  const totalHours = windowDays * 24;
  const windowSums = new Map<number, number>();

  for (const bucket of buckets) {
    const ageHours = ageHoursOf(bucket, now);
    if (ageHours < 0 || ageHours >= totalHours) continue;
    const activity = postBucketActivity(bucket);
    if (activity <= 0) continue;
    const windowIndex = Math.floor(ageHours / TREND_BASELINE_WINDOW_HOURS);
    windowSums.set(windowIndex, (windowSums.get(windowIndex) ?? 0) + activity);
  }

  const nonEmptyWindows = windowSums.size;
  if (nonEmptyWindows === 0) return { average: 0, nonEmptyWindows };

  const total = [...windowSums.values()].reduce((sum, value) => sum + value, 0);
  return { average: total / nonEmptyWindows, nonEmptyWindows };
};

export const computeGlobalPostBaseline = (
  bucketsByLook: Map<string, PostMetricBucket[]>,
  now: Date,
  windowDays: number,
): number => {
  const averages: number[] = [];
  for (const buckets of bucketsByLook.values()) {
    const { average, nonEmptyWindows } = computeOwnPostBaseline(buckets, now, windowDays);
    if (nonEmptyWindows > 0) averages.push(average);
  }
  if (averages.length === 0) return 0;
  return averages.reduce((sum, value) => sum + value, 0) / averages.length;
};

export const isWithinPostFreshnessWindow = (createdAt: Date, now: Date): boolean =>
  now.getTime() - createdAt.getTime() <= TREND_FRESHNESS_WINDOW_MS;

const pickPostBaseline = (
  ownBaseline: { average: number; nonEmptyWindows: number },
  globalBaseline: number,
): { source: PostBaselineSource; value: number } =>
  ownBaseline.nonEmptyWindows >= TREND_MIN_BUCKETS_FOR_OWN_BASELINE
    ? { source: "post", value: ownBaseline.average }
    : { source: "global", value: globalBaseline };

export const scorePost = (params: {
  lookId: string;
  creatorId: string;
  buckets: PostMetricBucket[];
  lookCreatedAt: Date;
  globalBaseline: number;
  now: Date;
}): PostScoreBreakdown => {
  const { lookId, creatorId, buckets, lookCreatedAt, globalBaseline, now } = params;

  const decayedActivity = sumDecayedPostActivityInWindow(
    buckets,
    now,
    TREND_CURRENT_WINDOW_START_HOURS,
    TREND_CURRENT_WINDOW_END_HOURS,
  );
  const previousWindowActivity = sumDecayedPostActivityInWindow(
    buckets,
    now,
    TREND_PREVIOUS_WINDOW_START_HOURS,
    TREND_PREVIOUS_WINDOW_END_HOURS,
  );
  const recentActivity = sumRawPostActivityInWindow(
    buckets,
    now,
    TREND_CURRENT_WINDOW_START_HOURS,
    TREND_CURRENT_WINDOW_END_HOURS,
  );

  const ownBaseline = computeOwnPostBaseline(buckets, now, TREND_BASELINE_WINDOW_DAYS);
  const baseline = pickPostBaseline(ownBaseline, globalBaseline);

  const velocity = decayedActivity / (previousWindowActivity + TREND_SMOOTHING);
  const baselineLift = decayedActivity / (baseline.value + TREND_SMOOTHING);
  const momentum = Math.min(Math.sqrt(velocity * baselineLift), TREND_MOMENTUM_CAP);
  const freshnessMultiplier = isWithinPostFreshnessWindow(lookCreatedAt, now)
    ? TREND_FRESHNESS_MULTIPLIER
    : 1;
  const score = decayedActivity * momentum * freshnessMultiplier;

  return {
    lookId,
    creatorId,
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
