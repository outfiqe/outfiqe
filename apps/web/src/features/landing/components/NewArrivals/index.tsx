import { ProductRail } from "../ProductRail";
import { NEW_ARRIVALS_PRODUCTS } from "./newArrivals.constants";

export function NewArrivals() {
  return (
    <ProductRail
      title="New arrivals"
      description="Added in the last seven days"
      products={NEW_ARRIVALS_PRODUCTS}
    />
  );
}
