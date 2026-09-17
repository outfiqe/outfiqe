import {
  AFFINITY_BOOST_CAP,
  AFFINITY_MAX_WEIGHT_PER_KEY,
  AFFINITY_WEIGHT_CART,
  AFFINITY_WEIGHT_LIKED_TAG,
  AFFINITY_WEIGHT_PURCHASE,
  AFFINITY_WEIGHT_SAVED,
  SALE_DISCOUNT_FRESHNESS_WINDOW_MS,
  SALE_DISCOUNT_PERCENT_MAX,
  SALE_DISCOUNT_PERCENT_MIN,
  SALE_FRESHNESS_WEIGHT_CAP,
  SALE_POPULARITY_WEIGHT_CAP,
} from "./sale.constants.js";
import type {
  AffinitySignal,
  AffinitySignalSource,
  SaleCandidate,
  ScoredSaleCandidate,
  ViewerAffinityWeights,
} from "./sale.types.js";

const NO_SCORE = 0;

const AFFINITY_SOURCE_WEIGHT: Record<AffinitySignalSource, number> = {
  saved: AFFINITY_WEIGHT_SAVED,
  cart: AFFINITY_WEIGHT_CART,
  purchase: AFFINITY_WEIGHT_PURCHASE,
  likedTag: AFFINITY_WEIGHT_LIKED_TAG,
};

export const computeDiscountPoints = (discountPercent: number): number =>
  Math.min(Math.max(discountPercent, SALE_DISCOUNT_PERCENT_MIN), SALE_DISCOUNT_PERCENT_MAX);

export const normalizeTrendingScore = (rawScore: number, topScore: number): number => {
  if (rawScore <= NO_SCORE || topScore <= NO_SCORE) return NO_SCORE;
  return Math.min(rawScore / topScore, 1);
};

export const computeFreshnessBoost = (startsAt: Date, now: Date): number => {
  const ageMs = now.getTime() - startsAt.getTime();
  if (ageMs < 0 || ageMs >= SALE_DISCOUNT_FRESHNESS_WINDOW_MS) return NO_SCORE;
  const remaining = 1 - ageMs / SALE_DISCOUNT_FRESHNESS_WINDOW_MS;
  return remaining * SALE_FRESHNESS_WEIGHT_CAP;
};

export const scoreSaleCandidate = (
  candidate: SaleCandidate,
  topTrendingScore: number,
  now: Date,
): ScoredSaleCandidate => {
  const discountPoints = computeDiscountPoints(candidate.discountPercent);
  const popularityPoints =
    normalizeTrendingScore(candidate.trendingScoreRaw, topTrendingScore) *
    SALE_POPULARITY_WEIGHT_CAP;
  const freshnessPoints = computeFreshnessBoost(candidate.discountStartsAt, now);

  return {
    ...candidate,
    discountPoints,
    popularityPoints,
    freshnessPoints,
    score: discountPoints + popularityPoints + freshnessPoints,
  };
};

const addWeight = (weights: Map<string, number>, key: string, amount: number): void => {
  const next = Math.min((weights.get(key) ?? NO_SCORE) + amount, AFFINITY_MAX_WEIGHT_PER_KEY);
  weights.set(key, next);
};

export const deriveAffinityWeights = (signals: AffinitySignal[]): ViewerAffinityWeights => {
  const categoryWeights = new Map<string, number>();
  const productTypeWeights = new Map<string, number>();
  const brandWeights = new Map<string, number>();

  for (const signal of signals) {
    const weight = AFFINITY_SOURCE_WEIGHT[signal.source];
    for (const categoryId of signal.categoryIds) {
      addWeight(categoryWeights, categoryId, weight);
    }
    addWeight(productTypeWeights, signal.productTypeId, weight);
    addWeight(brandWeights, signal.brandId, weight);
  }

  return { categoryWeights, productTypeWeights, brandWeights };
};

const sumMatchedWeight = (weights: Map<string, number>, keys: string[]): number =>
  keys.reduce((sum, key) => sum + (weights.get(key) ?? NO_SCORE), NO_SCORE);

export const applyPersonalization = <T extends ScoredSaleCandidate>(
  candidates: T[],
  affinity: ViewerAffinityWeights,
): T[] =>
  candidates.map((candidate) => {
    const rawBoost =
      sumMatchedWeight(affinity.categoryWeights, candidate.categoryIds) +
      (affinity.productTypeWeights.get(candidate.productTypeId) ?? NO_SCORE) +
      (affinity.brandWeights.get(candidate.brandId) ?? NO_SCORE);
    const cappedBoost = Math.min(rawBoost, AFFINITY_BOOST_CAP);

    return { ...candidate, score: candidate.score * (1 + cappedBoost) };
  });

export const excludeAlreadyPurchased = <T extends { productId: string }>(
  candidates: T[],
  purchasedProductIds: string[],
): T[] => {
  const purchased = new Set(purchasedProductIds);
  return candidates.filter((candidate) => !purchased.has(candidate.productId));
};
