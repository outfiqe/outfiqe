import type { PublicProductType } from "@outfiqe/types";

import type { ProductTypeRecord } from "./product-type.types.js";

export const toPublicProductType = (productType: ProductTypeRecord): PublicProductType => ({
  id: productType.id,
  slug: productType.slug,
  label: productType.label,
});
