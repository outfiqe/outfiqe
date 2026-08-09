import { ProductRail } from "../ProductRail";
import { TRENDING_PRODUCTS } from "./trendingNow.constants";

export function TrendingNow() {
  return (
    <ProductRail
      eyebrow="Moving fast this week"
      title="Trending now"
      viewAllHref="#"
      viewAllLabel="See More"
      products={TRENDING_PRODUCTS}
    />
  );
}
