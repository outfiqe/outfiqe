import { describe, expect, it } from "vitest";

import {
  BASELINE_WINDOW_DAYS,
  FRESHNESS_MULTIPLIER,
  FRESHNESS_WINDOW_MS,
  MIN_BUCKETS_FOR_OWN_BASELINE,
  MOMENTUM_CAP,
} from "./trending.constants.js";
import type { MetricBucket, ProductTrendMeta } from "./trending.types.js";
import {
  applyDiversity,
  bucketActivity,
  computeGroupBaselines,
  computeOwnBaseline,
  groupBucketsByProduct,
  isWithinFreshnessWindow,
  pickBaseline,
  scoreProduct,
} from "./trending.utils.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;

const bucketAgeHoursAgo = (
  productId: string,
  ageHours: number,
  activity: Partial<Omit<MetricBucket, "productId" | "bucketStart">> = {},
): MetricBucket => ({
  productId,
  bucketStart: new Date(NOW.getTime() - ageHours * HOUR_MS),
  purchaseUnits: 0,
  cartAdds: 0,
  saves: 0,
  creatorTags: 0,
  tagClicks: 0,
  ...activity,
});

describe("bucketActivity", () => {
  it("returns zero for a bucket with no activity", () => {
    expect(
      bucketActivity({ purchaseUnits: 0, cartAdds: 0, saves: 0, creatorTags: 0, tagClicks: 0 }),
    ).toBe(0);
  });

  it("weighs purchase units more heavily than tag clicks", () => {
    const fromPurchase = bucketActivity({
      purchaseUnits: 1,
      cartAdds: 0,
      saves: 0,
      creatorTags: 0,
      tagClicks: 0,
    });
    const fromTagClick = bucketActivity({
      purchaseUnits: 0,
      cartAdds: 0,
      saves: 0,
      creatorTags: 0,
      tagClicks: 1,
    });
    expect(fromPurchase).toBeGreaterThan(fromTagClick);
  });
});

describe("groupBucketsByProduct", () => {
  it("groups buckets under their product while preserving arrival order", () => {
    const bucketA1 = bucketAgeHoursAgo("product-a", 1);
    const bucketB1 = bucketAgeHoursAgo("product-b", 1);
    const bucketA2 = bucketAgeHoursAgo("product-a", 2);

    const grouped = groupBucketsByProduct([bucketA1, bucketB1, bucketA2]);

    expect([...grouped.keys()]).toEqual(["product-a", "product-b"]);
    expect(grouped.get("product-a")).toEqual([bucketA1, bucketA2]);
    expect(grouped.get("product-b")).toEqual([bucketB1]);
  });

  it("returns an empty map for no buckets", () => {
    expect(groupBucketsByProduct([]).size).toBe(0);
  });
});

describe("computeOwnBaseline", () => {
  it("reports zero non-empty windows when a product has no history", () => {
    const { average, nonEmptyWindows } = computeOwnBaseline([], NOW, BASELINE_WINDOW_DAYS);
    expect(nonEmptyWindows).toBe(0);
    expect(average).toBe(0);
  });

  it("averages activity across distinct baseline windows only", () => {
    const buckets = [
      bucketAgeHoursAgo("product-a", 1, { saves: 4 }),
      bucketAgeHoursAgo("product-a", 8, { saves: 4 }),
    ];
    const { nonEmptyWindows } = computeOwnBaseline(buckets, NOW, BASELINE_WINDOW_DAYS);
    expect(nonEmptyWindows).toBe(2);
  });
});

describe("computeGroupBaselines", () => {
  it("falls back to a zero global baseline when nothing has any history", () => {
    const { byType, global } = computeGroupBaselines(
      new Map(),
      new Map(),
      NOW,
      BASELINE_WINDOW_DAYS,
    );
    expect(byType.size).toBe(0);
    expect(global).toBe(0);
  });

  it("groups baselines by productTypeId, not by product", () => {
    const meta: ProductTrendMeta[] = [
      { id: "product-a", brandId: "brand-1", productTypeId: "type-1", createdAt: NOW },
      { id: "product-b", brandId: "brand-2", productTypeId: "type-1", createdAt: NOW },
    ];
    const bucketsByProduct = new Map<string, MetricBucket[]>([
      ["product-a", [bucketAgeHoursAgo("product-a", 1, { saves: 4 })]],
      ["product-b", [bucketAgeHoursAgo("product-b", 1, { saves: 2 })]],
    ]);
    const metaById = new Map(meta.map((row) => [row.id, row]));

    const { byType } = computeGroupBaselines(bucketsByProduct, metaById, NOW, BASELINE_WINDOW_DAYS);

    expect(byType.get("type-1")).toBeGreaterThan(0);
  });
});

describe("isWithinFreshnessWindow", () => {
  it("treats the exact freshness boundary as still fresh", () => {
    const createdAt = new Date(NOW.getTime() - FRESHNESS_WINDOW_MS);
    expect(isWithinFreshnessWindow(createdAt, NOW)).toBe(true);
  });

  it("treats a product just past the freshness window as not fresh", () => {
    const createdAt = new Date(NOW.getTime() - FRESHNESS_WINDOW_MS - 1);
    expect(isWithinFreshnessWindow(createdAt, NOW)).toBe(false);
  });
});

describe("pickBaseline", () => {
  it("uses the product's own baseline once it has enough history", () => {
    const ownBaseline = { average: 5, nonEmptyWindows: MIN_BUCKETS_FOR_OWN_BASELINE };
    const result = pickBaseline("type-1", ownBaseline, new Map([["type-1", 2]]), 1);
    expect(result).toEqual({ source: "product", value: 5 });
  });

  it("falls back to the category baseline when the product has too little history", () => {
    const ownBaseline = { average: 5, nonEmptyWindows: MIN_BUCKETS_FOR_OWN_BASELINE - 1 };
    const result = pickBaseline("type-1", ownBaseline, new Map([["type-1", 3]]), 1);
    expect(result).toEqual({ source: "category", value: 3 });
  });

  it("falls back to the global baseline when neither the product nor its category has history", () => {
    const ownBaseline = { average: 0, nonEmptyWindows: 0 };
    const result = pickBaseline("type-1", ownBaseline, new Map(), 7);
    expect(result).toEqual({ source: "global", value: 7 });
  });
});

describe("scoreProduct", () => {
  const baseParams = {
    productId: "product-a",
    brandId: "brand-1",
    productCreatedAt: new Date(NOW.getTime() - 30 * 24 * HOUR_MS),
    productType: "type-1",
    categoryBaselines: new Map<string, number>(),
    globalBaseline: 0,
    now: NOW,
  };

  it("scores a cold-start product with no activity as zero, without producing NaN", () => {
    const breakdown = scoreProduct({ ...baseParams, buckets: [] });

    expect(breakdown.score).toBe(0);
    expect(breakdown.decayedActivity).toBe(0);
    expect(breakdown.previousWindowActivity).toBe(0);
    expect(Number.isFinite(breakdown.velocity)).toBe(true);
    expect(Number.isFinite(breakdown.baselineLift)).toBe(true);
  });

  it("never divides by zero when both the baseline and the previous window are empty", () => {
    const buckets = [bucketAgeHoursAgo("product-a", 1, { saves: 6 })];
    const breakdown = scoreProduct({ ...baseParams, buckets, globalBaseline: 0 });

    expect(Number.isFinite(breakdown.velocity)).toBe(true);
    expect(Number.isFinite(breakdown.baselineLift)).toBe(true);
    expect(Number.isFinite(breakdown.momentum)).toBe(true);
    expect(breakdown.score).toBeGreaterThan(0);
  });

  it("caps momentum at MOMENTUM_CAP for an extreme spike over a tiny baseline", () => {
    const buckets = [bucketAgeHoursAgo("product-a", 1, { purchaseUnits: 500 })];
    const breakdown = scoreProduct({ ...baseParams, buckets, globalBaseline: 0.001 });

    expect(breakdown.momentum).toBeLessThanOrEqual(MOMENTUM_CAP);
  });

  it("applies the freshness multiplier only within the freshness window", () => {
    const buckets = [bucketAgeHoursAgo("product-a", 1, { saves: 4 })];

    const freshBreakdown = scoreProduct({
      ...baseParams,
      buckets,
      productCreatedAt: new Date(NOW.getTime() - FRESHNESS_WINDOW_MS),
    });
    const staleBreakdown = scoreProduct({
      ...baseParams,
      buckets,
      productCreatedAt: new Date(NOW.getTime() - FRESHNESS_WINDOW_MS - 1),
    });

    expect(freshBreakdown.freshnessMultiplier).toBe(FRESHNESS_MULTIPLIER);
    expect(staleBreakdown.freshnessMultiplier).toBe(1);
    expect(freshBreakdown.score).toBeGreaterThan(staleBreakdown.score);
  });
});

describe("applyDiversity", () => {
  it("caps how many candidates from the same brand make the pool", () => {
    const candidates = [
      { productId: "p1", brandId: "brand-1", score: 10 },
      { productId: "p2", brandId: "brand-1", score: 9 },
      { productId: "p3", brandId: "brand-1", score: 8 },
      { productId: "p4", brandId: "brand-2", score: 7 },
    ];

    const diverse = applyDiversity(candidates, 10, 2);

    expect(diverse.map((candidate) => candidate.productId)).toEqual(["p1", "p2", "p4"]);
  });
});
