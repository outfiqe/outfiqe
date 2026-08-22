import {
  ageHoursOf,
  computeOwnBaseline,
  meanOf,
  sumDecayedActivityInWindow,
} from "#lib/trend-scoring.utils.js";

import {
  BOT_USER_AGENT_PATTERNS,
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
  CreatorLookFeedPost,
  CreatorLookSummary,
  CreatorMomentumEntry,
  PostBaselineSource,
  PostMetricBucket,
  PostScoreBreakdown,
  PostSuggestion,
  TagBaselineSource,
  TagMetricBucket,
  TagScoreBreakdown,
} from "./creatorLook.types.js";

export const isLikelyBotUserAgent = (userAgent: string | undefined): boolean => {
  if (!userAgent) return true;
  const normalized = userAgent.toLowerCase();
  return BOT_USER_AGENT_PATTERNS.some((pattern) => normalized.includes(pattern));
};

export const toSuggestion = ({
  id,
  imageUrl,
  caption,
  creator,
}: CreatorLookFeedPost): PostSuggestion => ({
  id,
  imageUrl,
  caption,
  creator: { name: creator.name, handle: creator.handle },
});

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
export type SearchLooksCursor = { offset: number };

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
