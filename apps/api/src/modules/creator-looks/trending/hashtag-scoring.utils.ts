import {
  ageHoursOf,
  computeOwnBaseline,
  meanOf,
  sumDecayedActivityInWindow,
} from "#lib/trend-scoring.utils.js";

import {
  TAG_TREND_BASELINE_WINDOW_DAYS,
  TAG_TREND_BASELINE_WINDOW_HOURS,
  TAG_TREND_CURRENT_WINDOW_END_HOURS,
  TAG_TREND_CURRENT_WINDOW_START_HOURS,
  TAG_TREND_DECAY_HALF_LIFE_HOURS,
  TAG_TREND_MIN_BUCKETS_FOR_OWN_BASELINE,
  TAG_TREND_MOMENTUM_CAP,
  TAG_TREND_PREVIOUS_WINDOW_END_HOURS,
  TAG_TREND_PREVIOUS_WINDOW_START_HOURS,
  TAG_TREND_SIGNAL_WEIGHT,
  TAG_TREND_SMOOTHING,
} from "../creator-look.constants.js";
import type {
  TagBaselineSource,
  TagMetricBucket,
  TagScoreBreakdown,
} from "../creator-look.types.js";

export const tagBucketActivity = (bucket: { postCount: number }): number =>
  TAG_TREND_SIGNAL_WEIGHT * Math.log1p(bucket.postCount);

export const groupTagBucketsByTag = (
  buckets: TagMetricBucket[],
): Map<string, TagMetricBucket[]> => {
  const grouped = new Map<string, TagMetricBucket[]>();
  for (const bucket of buckets) {
    const existing = grouped.get(bucket.tag);
    if (existing) existing.push(bucket);
    else grouped.set(bucket.tag, [bucket]);
  }
  return grouped;
};

const sumDecayedTagActivityInWindow = (
  buckets: TagMetricBucket[],
  now: Date,
  windowStartHoursAgo: number,
  windowEndHoursAgo: number,
): number =>
  sumDecayedActivityInWindow(
    buckets,
    now,
    windowStartHoursAgo,
    windowEndHoursAgo,
    TAG_TREND_DECAY_HALF_LIFE_HOURS,
    tagBucketActivity,
  );

const sumRawTagActivityInWindow = (
  buckets: TagMetricBucket[],
  now: Date,
  windowStartHoursAgo: number,
  windowEndHoursAgo: number,
): TagScoreBreakdown["recentActivity"] => {
  let postCount = 0;
  for (const bucket of buckets) {
    const ageHours = ageHoursOf(bucket, now);
    if (ageHours < windowStartHoursAgo || ageHours >= windowEndHoursAgo) continue;
    postCount += bucket.postCount;
  }
  return { postCount };
};

export const computeOwnTagBaseline = (
  buckets: TagMetricBucket[],
  now: Date,
  windowDays: number,
): { average: number; nonEmptyWindows: number } =>
  computeOwnBaseline(buckets, now, windowDays, TAG_TREND_BASELINE_WINDOW_HOURS, tagBucketActivity);

export const computeGlobalTagBaseline = (
  bucketsByTag: Map<string, TagMetricBucket[]>,
  now: Date,
  windowDays: number,
): number => {
  const averages: number[] = [];
  for (const buckets of bucketsByTag.values()) {
    const { average, nonEmptyWindows } = computeOwnTagBaseline(buckets, now, windowDays);
    if (nonEmptyWindows > 0) averages.push(average);
  }
  return meanOf(averages);
};

const pickTagBaseline = (
  ownBaseline: { average: number; nonEmptyWindows: number },
  globalBaseline: number,
): { source: TagBaselineSource; value: number } =>
  ownBaseline.nonEmptyWindows >= TAG_TREND_MIN_BUCKETS_FOR_OWN_BASELINE
    ? { source: "tag", value: ownBaseline.average }
    : { source: "global", value: globalBaseline };

export const scoreTag = (params: {
  tag: string;
  buckets: TagMetricBucket[];
  globalBaseline: number;
  now: Date;
}): TagScoreBreakdown => {
  const { tag, buckets, globalBaseline, now } = params;

  const decayedActivity = sumDecayedTagActivityInWindow(
    buckets,
    now,
    TAG_TREND_CURRENT_WINDOW_START_HOURS,
    TAG_TREND_CURRENT_WINDOW_END_HOURS,
  );
  const previousWindowActivity = sumDecayedTagActivityInWindow(
    buckets,
    now,
    TAG_TREND_PREVIOUS_WINDOW_START_HOURS,
    TAG_TREND_PREVIOUS_WINDOW_END_HOURS,
  );
  const recentActivity = sumRawTagActivityInWindow(
    buckets,
    now,
    TAG_TREND_CURRENT_WINDOW_START_HOURS,
    TAG_TREND_CURRENT_WINDOW_END_HOURS,
  );

  const ownBaseline = computeOwnTagBaseline(buckets, now, TAG_TREND_BASELINE_WINDOW_DAYS);
  const baseline = pickTagBaseline(ownBaseline, globalBaseline);

  const velocity = decayedActivity / (previousWindowActivity + TAG_TREND_SMOOTHING);
  const baselineLift = decayedActivity / (baseline.value + TAG_TREND_SMOOTHING);
  const momentum = Math.min(Math.sqrt(velocity * baselineLift), TAG_TREND_MOMENTUM_CAP);
  const score = decayedActivity * momentum;

  return {
    tag,
    recentActivity,
    decayedActivity,
    previousWindowActivity,
    velocity,
    baseline,
    baselineLift,
    momentum,
    score,
  };
};
