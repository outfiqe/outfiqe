import { describe, expect, it } from "vitest";

import {
  AFFINITY_BOOST_CAP,
  AFFINITY_MAX_WEIGHT_PER_KEY,
  AFFINITY_WEIGHT_CART,
  AFFINITY_WEIGHT_SAVED,
  SALE_DISCOUNT_FRESHNESS_WINDOW_MS,
  SALE_FRESHNESS_WEIGHT_CAP,
  SALE_POPULARITY_WEIGHT_CAP,
} from "./sale.constants.js";
import type { AffinitySignal, SaleCandidate, ScoredSaleCandidate } from "./sale.types.js";
import {
  applyPersonalization,
  computeDiscountPoints,
  computeFreshnessBoost,
  deriveAffinityWeights,
  excludeAlreadyPurchased,
  normalizeTrendingScore,
  scoreSaleCandidate,
} from "./sale.utils.js";

const NOW = new Date("2026-01-01T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

const candidate = (overrides: Partial<SaleCandidate> = {}): SaleCandidate => ({
  productId: "product-1",
  brandId: "brand-1",
  categoryIds: ["category-1"],
  productTypeId: "type-1",
  discountPercent: 20,
  discountStartsAt: NOW,
  trendingScoreRaw: 0,
  ...overrides,
});

describe("computeDiscountPoints", () => {
  it("passes a normal percent straight through", () => {
    expect(computeDiscountPoints(35)).toBe(35);
  });

  it("clamps to the 0-100 range defensively", () => {
    expect(computeDiscountPoints(-5)).toBe(0);
    expect(computeDiscountPoints(150)).toBe(100);
  });
});

describe("normalizeTrendingScore", () => {
  it("returns 0 when the product has no trending score (cold start)", () => {
    expect(normalizeTrendingScore(0, 500)).toBe(0);
  });

  it("returns 0 when nothing is trending yet", () => {
    expect(normalizeTrendingScore(10, 0)).toBe(0);
  });

  it("scales relative to the current top trending score", () => {
    expect(normalizeTrendingScore(250, 500)).toBe(0.5);
  });

  it("never exceeds 1 even if raw score somehow exceeds the top score", () => {
    expect(normalizeTrendingScore(600, 500)).toBe(1);
  });
});

describe("computeFreshnessBoost", () => {
  it("is at its cap the instant a discount starts", () => {
    expect(computeFreshnessBoost(NOW, NOW)).toBeCloseTo(SALE_FRESHNESS_WEIGHT_CAP);
  });

  it("decays linearly toward 0 across the freshness window", () => {
    const halfway = new Date(NOW.getTime() + SALE_DISCOUNT_FRESHNESS_WINDOW_MS / 2);
    expect(computeFreshnessBoost(NOW, halfway)).toBeCloseTo(SALE_FRESHNESS_WEIGHT_CAP / 2);
  });

  it("is 0 once the freshness window has fully elapsed", () => {
    const later = new Date(NOW.getTime() + SALE_DISCOUNT_FRESHNESS_WINDOW_MS);
    expect(computeFreshnessBoost(NOW, later)).toBe(0);
  });

  it("is 0 for a discount that (defensively) starts in the future", () => {
    const future = new Date(NOW.getTime() + DAY_MS);
    expect(computeFreshnessBoost(future, NOW)).toBe(0);
  });
});

describe("scoreSaleCandidate — discount depth dominates", () => {
  it("a bigger discount always outranks a smaller one, regardless of popularity", () => {
    const shallowButPopular = scoreSaleCandidate(
      candidate({ productId: "shallow", discountPercent: 20, trendingScoreRaw: 1000 }),
      1000,
      NOW,
    );
    const deepButUnpopular = scoreSaleCandidate(
      candidate({ productId: "deep", discountPercent: 30, trendingScoreRaw: 0 }),
      1000,
      NOW,
    );

    expect(deepButUnpopular.score).toBeGreaterThan(shallowButPopular.score);
  });

  it("popularity and freshness together can never overcome a 10-point discount gap", () => {
    const maxPopularityAndFreshnessBoost = SALE_POPULARITY_WEIGHT_CAP + SALE_FRESHNESS_WEIGHT_CAP;
    expect(maxPopularityAndFreshnessBoost).toBeLessThan(10);
  });

  it("popularity and freshness still break ties among similarly-discounted products", () => {
    const morePopular = scoreSaleCandidate(
      candidate({ productId: "popular", discountPercent: 20, trendingScoreRaw: 800 }),
      1000,
      NOW,
    );
    const lessPopular = scoreSaleCandidate(
      candidate({ productId: "unpopular", discountPercent: 20, trendingScoreRaw: 100 }),
      1000,
      NOW,
    );

    expect(morePopular.score).toBeGreaterThan(lessPopular.score);
  });
});

describe("deriveAffinityWeights", () => {
  it("weighs an explicit save higher than an inferred liked-look tag", () => {
    const signals: AffinitySignal[] = [
      { source: "saved", categoryIds: ["category-1"], productTypeId: "type-1", brandId: "brand-1" },
    ];
    const likedTagSignals: AffinitySignal[] = [
      {
        source: "likedTag",
        categoryIds: ["category-1"],
        productTypeId: "type-1",
        brandId: "brand-1",
      },
    ];

    const savedWeights = deriveAffinityWeights(signals);
    const likedTagWeights = deriveAffinityWeights(likedTagSignals);

    expect(savedWeights.categoryWeights.get("category-1")).toBeCloseTo(AFFINITY_WEIGHT_SAVED);
    expect(likedTagWeights.categoryWeights.get("category-1")).toBeLessThan(
      savedWeights.categoryWeights.get("category-1") ?? 0,
    );
  });

  it("caps repeated signals on the same category so one product can't dominate", () => {
    const repeatedSignals: AffinitySignal[] = Array.from({ length: 10 }, () => ({
      source: "cart" as const,
      categoryIds: ["category-1"],
      productTypeId: "type-1",
      brandId: "brand-1",
    }));

    const weights = deriveAffinityWeights(repeatedSignals);

    expect(weights.categoryWeights.get("category-1")).toBeLessThanOrEqual(
      AFFINITY_MAX_WEIGHT_PER_KEY,
    );
  });

  it("accumulates weight across multiple distinct signals for the same category", () => {
    const signals: AffinitySignal[] = [
      { source: "saved", categoryIds: ["category-1"], productTypeId: "type-1", brandId: "brand-1" },
      { source: "cart", categoryIds: ["category-1"], productTypeId: "type-2", brandId: "brand-2" },
    ];

    const weights = deriveAffinityWeights(signals);

    expect(weights.categoryWeights.get("category-1")).toBeCloseTo(
      Math.min(AFFINITY_WEIGHT_SAVED + AFFINITY_WEIGHT_CART, AFFINITY_MAX_WEIGHT_PER_KEY),
    );
  });
});

describe("applyPersonalization", () => {
  it("boosts a candidate matching the viewer's affinity", () => {
    const scored = scoreSaleCandidate(candidate({ discountPercent: 20 }), 0, NOW);
    const affinity = deriveAffinityWeights([
      { source: "saved", categoryIds: ["category-1"], productTypeId: "type-1", brandId: "brand-1" },
    ]);

    const [personalized] = applyPersonalization([scored], affinity);

    expect(personalized?.score).toBeGreaterThan(scored.score);
  });

  it("leaves an unmatched candidate's score unchanged", () => {
    const scored = scoreSaleCandidate(candidate({ discountPercent: 20 }), 0, NOW);
    const affinity = deriveAffinityWeights([
      {
        source: "saved",
        categoryIds: ["some-other-category"],
        productTypeId: "some-other-type",
        brandId: "some-other-brand",
      },
    ]);

    const [personalized] = applyPersonalization([scored], affinity);

    expect(personalized?.score).toBeCloseTo(scored.score);
  });

  it("caps the total personalization boost so it can't fully invert a large discount gap", () => {
    const shallowDiscount = scoreSaleCandidate(
      candidate({ productId: "shallow", discountPercent: 15 }),
      0,
      NOW,
    );
    const deepDiscount = scoreSaleCandidate(
      candidate({ productId: "deep", discountPercent: 40, categoryIds: ["category-2"] }),
      0,
      NOW,
    );
    const strongAffinity = deriveAffinityWeights(
      Array.from({ length: 10 }, () => ({
        source: "cart" as const,
        categoryIds: ["category-1"],
        productTypeId: "type-1",
        brandId: "brand-1",
      })),
    );

    const [boostedShallow] = applyPersonalization([shallowDiscount], strongAffinity);

    expect(boostedShallow?.score).toBeLessThan(deepDiscount.score);
    expect(boostedShallow?.score).toBeCloseTo(shallowDiscount.score * (1 + AFFINITY_BOOST_CAP));
  });
});

describe("excludeAlreadyPurchased", () => {
  it("removes a candidate the viewer has already bought", () => {
    const candidates: ScoredSaleCandidate[] = [
      scoreSaleCandidate(candidate({ productId: "bought" }), 0, NOW),
      scoreSaleCandidate(candidate({ productId: "not-bought" }), 0, NOW),
    ];

    const result = excludeAlreadyPurchased(candidates, ["bought"]);

    expect(result.map((c) => c.productId)).toEqual(["not-bought"]);
  });

  it("is a no-op when the viewer has purchased nothing in the pool", () => {
    const candidates: ScoredSaleCandidate[] = [
      scoreSaleCandidate(candidate({ productId: "a" }), 0, NOW),
      scoreSaleCandidate(candidate({ productId: "b" }), 0, NOW),
    ];

    expect(excludeAlreadyPurchased(candidates, []).length).toBe(2);
  });
});
