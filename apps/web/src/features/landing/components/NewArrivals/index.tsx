import { getNewArrivalsServer } from "@/features/products/api/getProductsServer";
import { ProductRail } from "../ProductRail";

export async function NewArrivals() {
  const products = await getNewArrivalsServer();

  return (
    <ProductRail
      title="New arrivals"
      description="Added in the last seven days"
      products={products}
    />
  );
}
