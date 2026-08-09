import { ProductRail } from "../ProductRail";
import { CREATOR_LOOKS_PRODUCTS } from "./creatorLooks.constants";

export function CreatorLooks() {
  return (
    <ProductRail
      title="Creator looks"
      description="Real fits from Nepali creators. Tap any tagged piece to shop it."
      products={CREATOR_LOOKS_PRODUCTS}
    />
  );
}
