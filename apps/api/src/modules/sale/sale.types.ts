export type SaleCandidate = {
  productId: string;
  brandId: string;
  categoryIds: string[];
  productTypeId: string;
  discountPercent: number;
  discountStartsAt: Date;
  trendingScoreRaw: number;
};

export type ScoredSaleCandidate = SaleCandidate & {
  discountPoints: number;
  popularityPoints: number;
  freshnessPoints: number;
  score: number;
};

export type AffinitySignalSource = "saved" | "cart" | "purchase" | "likedTag";

export type AffinitySignal = {
  source: AffinitySignalSource;
  categoryIds: string[];
  productTypeId: string;
  brandId: string;
};

export type ViewerAffinityWeights = {
  categoryWeights: Map<string, number>;
  productTypeWeights: Map<string, number>;
  brandWeights: Map<string, number>;
};

export type ViewerShoppingSignals = {
  signals: AffinitySignal[];
  purchasedProductIds: string[];
};
