import { getNewArrivalsServer } from "@/features/products/api/getProductsServer";

import { ProductRail } from "../ProductRail";

export const NewArrivals = async () => {
  const products = await getNewArrivalsServer();

  return (
    <ProductRail
      title="New arrivals"
      description="Added in the last seven days"
      viewAllHref="/shop?sort=new-arrivals"
      products={products}
    />
  );
};
