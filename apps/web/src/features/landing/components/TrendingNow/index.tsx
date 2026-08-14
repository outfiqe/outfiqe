import { getTrendingProductsServer } from "@/features/products/api/getProductsServer";

import { ProductRail } from "../ProductRail";

export const TrendingNow = async () => {
  const products = await getTrendingProductsServer();

  return (
    <ProductRail
      eyebrow="Moving fast this week"
      title="Trending now"
      viewAllHref="#"
      viewAllLabel="See More"
      products={products}
    />
  );
};
