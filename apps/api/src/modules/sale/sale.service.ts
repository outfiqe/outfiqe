import { applyDiversity, applyWeightedRotation } from "#lib/trend-scoring.utils.js";
import logger from "#lib/winston.utils.js";
import { productRepository } from "#modules/products/product.repository.js";
import { trendingService } from "#modules/trending/trending.service.js";
import { cacheService } from "#redis/cache.service.js";
import { CACHE_TTL, redisKeys } from "#redis/redis.keys.js";
import { describeError } from "#redis/redis.utils.js";

import {
  SALE_CANDIDATE_POOL_SIZE,
  SALE_DIVERSE_POOL_LIMIT,
  SALE_MAX_PER_BRAND,
  SALE_ROTATION_TIE_BAND,
  SALE_SCORE_RECOMPUTE_LOCK_TTL_MS,
  SALE_SCORING_INTERVAL_MS,
} from "./sale.constants.js";
import { saleRepository } from "./sale.repository.js";
import type { SaleDebugSnapshot, SaleProductSummary, ScoredSaleCandidate } from "./sale.types.js";
import {
  applyPersonalization,
  deriveAffinityWeights,
  excludeAlreadyPurchased,
  scoreSaleCandidate,
} from "./sale.utils.js";

const SALE_CACHE_KEY = redisKeys.cache("product-sale", "global");
const SALE_SCORE_RECOMPUTE_LOCK_KEY = redisKeys.lock("product-sale-score-recompute");

const saleScoreCacheTtl = (ranked: ScoredSaleCandidate[]): number =>
  ranked.length > 0 ? CACHE_TTL.PRODUCT_SALE : CACHE_TTL.PRODUCT_SALE_EMPTY;

const computeScoredSaleCandidates = async (now: Date): Promise<ScoredSaleCandidate[]> => {
  const [discountCandidates, trendingScores] = await Promise.all([
    saleRepository.listActiveDiscountCandidates(),
    trendingService.getTrendingProductScores(),
  ]);

  const topTrendingScore = Math.max(0, ...trendingScores.values());

  return discountCandidates
    .map((candidate) =>
      scoreSaleCandidate(
        { ...candidate, trendingScoreRaw: trendingScores.get(candidate.productId) ?? 0 },
        topTrendingScore,
        now,
      ),
    )
    .sort((a, b) => b.score - a.score || a.productId.localeCompare(b.productId));
};

const computeRankedSaleCandidates = async (): Promise<ScoredSaleCandidate[]> => {
  const now = new Date();
  const scored = await computeScoredSaleCandidates(now);

  const pool = scored.slice(0, SALE_CANDIDATE_POOL_SIZE);
  const diverse = applyDiversity(
    pool,
    SALE_DIVERSE_POOL_LIMIT,
    SALE_MAX_PER_BRAND,
    (candidate) => candidate.brandId,
  );
  const seed = Math.floor(now.getTime() / SALE_SCORING_INTERVAL_MS);
  return applyWeightedRotation(diverse, SALE_ROTATION_TIE_BAND, seed);
};

const getOrRecomputeSaleScores = async (): Promise<ScoredSaleCandidate[]> => {
  let cached: ScoredSaleCandidate[] | null = null;
  try {
    cached = await cacheService.get<ScoredSaleCandidate[]>(SALE_CACHE_KEY);
  } catch (error) {
    logger.warn(`Cache read failed for "${SALE_CACHE_KEY}": ${describeError(error)}`);
  }
  if (cached !== null) return cached;

  try {
    const recomputed = await cacheService.withLock(
      SALE_SCORE_RECOMPUTE_LOCK_KEY,
      SALE_SCORE_RECOMPUTE_LOCK_TTL_MS,
      async () => {
        logger.info(
          `On-demand product sale score recompute triggered (cache miss for "${SALE_CACHE_KEY}")`,
        );
        const fresh = await computeRankedSaleCandidates();
        await cacheService.set(SALE_CACHE_KEY, fresh, saleScoreCacheTtl(fresh));
        return fresh;
      },
    );
    return recomputed ?? [];
  } catch (error) {
    logger.warn(`On-demand product sale score recompute failed: ${describeError(error)}`);
    return [];
  }
};

export const saleService = {
  async runScoring(): Promise<{ ranked: ScoredSaleCandidate[] }> {
    const ranked = await computeRankedSaleCandidates();
    if (ranked.length === 0) {
      logger.warn("product-sale-scoring produced zero scored products this cycle");
    }
    await cacheService.set(SALE_CACHE_KEY, ranked, saleScoreCacheTtl(ranked));
    return { ranked };
  },

  async getSaleProductIds(viewerId: string | undefined, limit: number): Promise<string[]> {
    const ranked = await getOrRecomputeSaleScores();
    if (!viewerId) return ranked.slice(0, limit).map((candidate) => candidate.productId);

    const { signals, purchasedProductIds } =
      await saleRepository.listViewerShoppingSignals(viewerId);
    const affinity = deriveAffinityWeights(signals);

    const personalized = applyPersonalization(
      excludeAlreadyPurchased(ranked, purchasedProductIds),
      affinity,
    ).sort((a, b) => b.score - a.score || a.productId.localeCompare(b.productId));

    return personalized.slice(0, limit).map((candidate) => candidate.productId);
  },

  async listTopSaleProducts(limit: number): Promise<SaleProductSummary[]> {
    const now = new Date();
    const scored = await computeScoredSaleCandidates(now);
    const top = scored.slice(0, limit);

    const products = await productRepository.listApprovedByIds(top.map((c) => c.productId));
    const productById = new Map(products.map((product) => [product.id, product]));

    const summaries: SaleProductSummary[] = [];
    top.forEach((candidate, index) => {
      const product = productById.get(candidate.productId);
      if (!product) return;
      summaries.push({
        productId: candidate.productId,
        name: product.name,
        brand: product.brand.name,
        imageUrl: product.imageUrl,
        discountPercent: candidate.discountPercent,
        score: candidate.score,
        rank: index + 1,
      });
    });
    return summaries;
  },

  async getDebugSnapshot(productId: string): Promise<SaleDebugSnapshot | null> {
    const now = new Date();
    const scored = await computeScoredSaleCandidates(now);
    const rankIndex = scored.findIndex((candidate) => candidate.productId === productId);
    if (rankIndex < 0) return null;

    const candidate = scored[rankIndex];
    if (!candidate) return null;
    return { ...candidate, rank: rankIndex + 1, scoredAt: now };
  },
};
