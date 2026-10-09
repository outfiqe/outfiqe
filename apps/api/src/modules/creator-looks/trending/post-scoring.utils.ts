import {
  ageHoursOf,
  computeOwnBaseline,
  meanOf,
  sumDecayedActivityInWindow,
} from "#lib/trend-scoring.utils.js";

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
} from "../creator-look.constants.js";
import type {
  CreatorMomentumEntry,
  PostBaselineSource,
  PostMetricBucket,
  PostScoreBreakdown,
} from "../creator-look.types.js";

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
): number =>
  sumDecayedActivityInWindow(
    buckets,
    now,
    windowStartHoursAgo,
    windowEndHoursAgo,
    TREND_DECAY_HALF_LIFE_HOURS,
    postBucketActivity,
  );

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
): { average: number; nonEmptyWindows: number } =>
  computeOwnBaseline(buckets, now, windowDays, TREND_BASELINE_WINDOW_HOURS, postBucketActivity);

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
  return meanOf(averages);
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

export const scoreCreatorMomentum = (params: {
  creatorId: string;
  buckets: PostMetricBucket[];
  globalBaseline: number;
  now: Date;
}): CreatorMomentumEntry => {
  const { creatorId, buckets, globalBaseline, now } = params;

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

  const ownBaseline = computeOwnPostBaseline(buckets, now, TREND_BASELINE_WINDOW_DAYS);
  const baseline = pickPostBaseline(ownBaseline, globalBaseline);

  const velocity = decayedActivity / (previousWindowActivity + TREND_SMOOTHING);
  const baselineLift = decayedActivity / (baseline.value + TREND_SMOOTHING);
  const momentumMultiplier = Math.min(Math.sqrt(velocity * baselineLift), TREND_MOMENTUM_CAP);

  return { creatorId, momentum: decayedActivity * momentumMultiplier };
};
