import { describe, expect, it } from "vitest";

import {
  TAG_TREND_CURRENT_WINDOW_END_HOURS,
  TAG_TREND_MIN_BUCKETS_FOR_OWN_BASELINE,
} from "../creator-look.constants.js";
import type { TagMetricBucket } from "../creator-look.types.js";
import {
  computeGlobalTagBaseline,
  computeOwnTagBaseline,
  groupTagBucketsByTag,
  scoreTag,
  tagBucketActivity,
} from "./hashtag-scoring.utils.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;

const tagBucketAgeHoursAgo = (
  tag: string,
  ageHours: number,
  postCount: number,
): TagMetricBucket => ({
  tag,
  bucketStart: new Date(NOW.getTime() - ageHours * HOUR_MS),
  postCount,
});

describe("tagBucketActivity", () => {
  it("scales log-dampened drop counts by the tag signal weight", () => {
    expect(tagBucketActivity({ postCount: 5 })).toBeCloseTo(1 * Math.log1p(5));
  });
});

describe("groupTagBucketsByTag", () => {
  it("groups buckets under their tag, preserving arrival order", () => {
    const bucketA1 = tagBucketAgeHoursAgo("summer", 1, 3);
    const bucketB1 = tagBucketAgeHoursAgo("denim", 2, 1);
    const bucketA2 = tagBucketAgeHoursAgo("summer", 3, 4);

    const grouped = groupTagBucketsByTag([bucketA1, bucketB1, bucketA2]);

    expect(grouped.get("summer")).toEqual([bucketA1, bucketA2]);
    expect(grouped.get("denim")).toEqual([bucketB1]);
  });
});

describe("computeOwnTagBaseline", () => {
  it("reports zero non-empty windows when there is no activity", () => {
    expect(computeOwnTagBaseline([], NOW, 14)).toEqual({ average: 0, nonEmptyWindows: 0 });
  });
});

describe("computeGlobalTagBaseline", () => {
  it("only folds in tags that had at least one non-empty window", () => {
    const bucketsByTag = new Map([
      ["summer", [tagBucketAgeHoursAgo("summer", 5, 4)]],
      ["idle-tag", [tagBucketAgeHoursAgo("idle-tag", 5, 0)]],
    ]);

    expect(computeGlobalTagBaseline(bucketsByTag, NOW, 14)).toBeGreaterThan(0);
  });

  it("returns zero when no tag had any activity", () => {
    expect(computeGlobalTagBaseline(new Map(), NOW, 14)).toBe(0);
  });
});

describe("scoreTag", () => {
  it("only counts buckets inside the current window toward recentActivity", () => {
    const buckets = [
      tagBucketAgeHoursAgo("summer", -1, 99),
      tagBucketAgeHoursAgo("summer", 2, 3),
      tagBucketAgeHoursAgo("summer", TAG_TREND_CURRENT_WINDOW_END_HOURS, 99),
    ];

    const { recentActivity } = scoreTag({
      tag: "summer",
      buckets,
      globalBaseline: 1,
      now: NOW,
    });

    expect(recentActivity).toEqual({ postCount: 3 });
  });

  it("falls back to the global baseline when the tag lacks enough history", () => {
    const buckets = [tagBucketAgeHoursAgo("summer", 2, 3)];

    const { baseline } = scoreTag({ tag: "summer", buckets, globalBaseline: 1, now: NOW });

    expect(baseline.source).toBe("global");
    expect(baseline.value).toBe(1);
  });

  it("uses the tag's own baseline once it has enough non-empty windows", () => {
    const buckets = Array.from({ length: TAG_TREND_MIN_BUCKETS_FOR_OWN_BASELINE }, (_, index) =>
      tagBucketAgeHoursAgo("summer", 10 + index * 10, 5),
    );

    const { baseline } = scoreTag({ tag: "summer", buckets, globalBaseline: 1, now: NOW });

    expect(baseline.source).toBe("tag");
  });
});
