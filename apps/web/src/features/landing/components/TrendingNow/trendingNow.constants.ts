import type { ExploreProduct } from "../ProductCard";

export const TRENDING_PRODUCTS: ExploreProduct[] = [
  { id: "trending-1", brand: "Kaanchi", name: "Pashmina scarf", price: 4650, wornByCount: 3 },
  { id: "trending-2", brand: "Aamo", name: "Ribbed knit polo", price: 2850, wornByCount: 1 },
  {
    id: "trending-3",
    brand: "Nepa Threads",
    name: "Structured blazer",
    price: 9200,
    wornByCount: 6,
    isNew: true,
  },
  { id: "trending-4", brand: "Kastha", name: "Tapered wool trouser", price: 5600, wornByCount: 0 },
  { id: "trending-5", brand: "Kaanchi", name: "Silk wrap blouse", price: 3900, wornByCount: 4 },
];
