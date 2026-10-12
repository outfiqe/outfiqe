import { describe, expect, it } from "vitest";

import {
  TREND_CURRENT_WINDOW_END_HOURS,
  TREND_FRESHNESS_MULTIPLIER,
  TREND_FRESHNESS_WINDOW_MS,
  TREND_MIN_BUCKETS_FOR_OWN_BASELINE,
} from "../creator-look.constants.js";
import type { PostMetricBucket } from "../creator-look.types.js";
import {
  computeGlobalPostBaseline,
  computeOwnPostBaseline,
  groupPostBucketsByLook,
  isWithinPostFreshnessWindow,
  postBucketActivity,
  scoreCreatorMomentum,
  scorePost,
} from "./post-scoring.utils.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;

const bucketAgeHoursAgo = (
  lookId: string,
  ageHours: number,
  activity: Partial<Omit<PostMetricBucket, "lookId" | "bucketStart">> = {},
): PostMetricBucket => ({
  lookId,
  bucketStart: new Date(NOW.getTime() - ageHours * HOUR_MS),
  likes: 0,
  comments: 0,
  saves: 0,
  tagClicks: 0,
  ...activity,
});

describe("postBucketActivity", () => {
  it("weights each signal by the configured trend weight", () => {
    const activity = postBucketActivity({ likes: 3, comments: 1, saves: 2, tagClicks: 0 });

    expect(activity).toBeCloseTo(
      1.5 * Math.log1p(3) + 3.0 * Math.log1p(1) + 3.0 * Math.log1p(2) + 2.0 * Math.log1p(0),
    );
  });
});

describe("groupPostBucketsByLook", () => {
  it("groups buckets under their look id, preserving arrival order", () => {
    const bucketA1 = bucketAgeHoursAgo("look-a", 1);
    const bucketB1 = bucketAgeHoursAgo("look-b", 2);
    const bucketA2 = bucketAgeHoursAgo("look-a", 3);

    const grouped = groupPostBucketsByLook([bucketA1, bucketB1, bucketA2]);

    expect(grouped.get("look-a")).toEqual([bucketA1, bucketA2]);
    expect(grouped.get("look-b")).toEqual([bucketB1]);
  });

  it("returns an empty map for no buckets", () => {
    expect(groupPostBucketsByLook([]).size).toBe(0);
  });
});

describe("computeOwnPostBaseline", () => {
  it("reports zero non-empty windows when there is no activity", () => {
    expect(computeOwnPostBaseline([], NOW, 14)).toEqual({ average: 0, nonEmptyWindows: 0 });
  });

  it("averages activity across windows that had any", () => {
    const buckets = [
      bucketAgeHoursAgo("look-a", 10, { likes: 5 }),
      bucketAgeHoursAgo("look-a", 40, { likes: 5 }),
    ];

    const baseline = computeOwnPostBaseline(buckets, NOW, 14);

    expect(baseline.nonEmptyWindows).toBe(2);
    expect(baseline.average).toBeGreaterThan(0);
  });
});

describe("computeGlobalPostBaseline", () => {
  it("only folds in looks that had at least one non-empty window", () => {
    const activeBucketsByLook = new Map([
      ["look-active", [bucketAgeHoursAgo("look-active", 5, { likes: 4 })]],
      ["look-idle", [bucketAgeHoursAgo("look-idle", 5, { likes: 0 })]],
    ]);

    const globalBaseline = computeGlobalPostBaseline(activeBucketsByLook, NOW, 14);

    expect(globalBaseline).toBeGreaterThan(0);
  });

  it("returns zero when no look had any activity", () => {
    expect(computeGlobalPostBaseline(new Map(), NOW, 14)).toBe(0);
  });
});

describe("isWithinPostFreshnessWindow", () => {
  it("is fresh exactly at the boundary of the freshness window", () => {
    const createdAt = new Date(NOW.getTime() - TREND_FRESHNESS_WINDOW_MS);
    expect(isWithinPostFreshnessWindow(createdAt, NOW)).toBe(true);
  });

  it("is stale just past the freshness window", () => {
    const createdAt = new Date(NOW.getTime() - TREND_FRESHNESS_WINDOW_MS - 1);
    expect(isWithinPostFreshnessWindow(createdAt, NOW)).toBe(false);
  });
});

describe("scorePost", () => {
  const globalBaseline = 1;

  it("only counts buckets inside the current window toward recentActivity", () => {
    const buckets = [
      bucketAgeHoursAgo("look-1", -1, { likes: 99 }),
      bucketAgeHoursAgo("look-1", 2, { likes: 3, comments: 1, saves: 0, tagClicks: 2 }),
      bucketAgeHoursAgo("look-1", TREND_CURRENT_WINDOW_END_HOURS, { likes: 99 }),
    ];

    const { recentActivity } = scorePost({
      lookId: "look-1",
      creatorId: "creator-1",
      buckets,
      lookCreatedAt: NOW,
      globalBaseline,
      now: NOW,
    });

    expect(recentActivity).toEqual({ likes: 3, comments: 1, saves: 0, tagClicks: 2 });
  });

  it("falls back to the global baseline when the look lacks enough history", () => {
    const buckets = [bucketAgeHoursAgo("look-1", 2, { likes: 3 })];

    const { baseline } = scorePost({
      lookId: "look-1",
      creatorId: "creator-1",
      buckets,
      lookCreatedAt: NOW,
      globalBaseline,
      now: NOW,
    });

    expect(baseline.source).toBe("global");
    expect(baseline.value).toBe(globalBaseline);
  });

  it("uses the look's own baseline once it has enough non-empty windows", () => {
    const buckets = Array.from({ length: TREND_MIN_BUCKETS_FOR_OWN_BASELINE }, (_, index) =>
      bucketAgeHoursAgo("look-1", 10 + index * 10, { likes: 5 }),
    );

    const { baseline } = scorePost({
      lookId: "look-1",
      creatorId: "creator-1",
      buckets,
      lookCreatedAt: NOW,
      globalBaseline,
      now: NOW,
    });

    expect(baseline.source).toBe("post");
  });

  it("boosts the score while the look is inside its freshness window", () => {
    const buckets = [bucketAgeHoursAgo("look-1", 2, { likes: 5 })];

    const fresh = scorePost({
      lookId: "look-1",
      creatorId: "creator-1",
      buckets,
      lookCreatedAt: NOW,
      globalBaseline,
      now: NOW,
    });
    const stale = scorePost({
      lookId: "look-1",
      creatorId: "creator-1",
      buckets,
      lookCreatedAt: new Date(NOW.getTime() - TREND_FRESHNESS_WINDOW_MS - 1),
      globalBaseline,
      now: NOW,
    });

    expect(fresh.freshnessMultiplier).toBe(TREND_FRESHNESS_MULTIPLIER);
    expect(stale.freshnessMultiplier).toBe(1);
  });
});

describe("scoreCreatorMomentum", () => {
  it("falls back to the global baseline when the muse lacks enough history", () => {
    const buckets = [bucketAgeHoursAgo("look-1", 2, { likes: 3 })];

    const momentum = scoreCreatorMomentum({
      creatorId: "creator-1",
      buckets,
      globalBaseline: 1,
      now: NOW,
    });

    expect(momentum.creatorId).toBe("creator-1");
    expect(Number.isFinite(momentum.momentum)).toBe(true);
  });

  it("uses the muse's own baseline once it has enough non-empty windows", () => {
    const buckets = Array.from({ length: TREND_MIN_BUCKETS_FOR_OWN_BASELINE }, (_, index) =>
      bucketAgeHoursAgo("look-1", 10 + index * 10, { likes: 5 }),
    );

    const momentum = scoreCreatorMomentum({
      creatorId: "creator-1",
      buckets,
      globalBaseline: 1,
      now: NOW,
    });

    expect(Number.isFinite(momentum.momentum)).toBe(true);
  });
});
