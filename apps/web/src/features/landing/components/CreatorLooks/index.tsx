import { getFeaturedCreatorLooksServer } from "@/features/products/api/getProductsServer";
import { ProductRail } from "../ProductRail";

export async function CreatorLooks() {
  const products = await getFeaturedCreatorLooksServer();

  return (
    <ProductRail
      title="Creator looks"
      description="Real fits from Nepali creators. Tap any tagged piece to shop it."
      products={products}
    />
  );
}
