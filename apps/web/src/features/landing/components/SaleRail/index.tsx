import { getSaleProductsServer } from "@/features/products/api/getProductsServer";

import { ProductRail } from "../ProductRail";

export const SaleRail = async () => {
  const products = await getSaleProductsServer();
  if (products.length === 0) return null;

  return (
    <ProductRail
      eyebrow="Today's deals"
      title="On Sale"
      viewAllHref="/shop?sort=on-sale"
      viewAllLabel="See More"
      products={products}
    />
  );
};
