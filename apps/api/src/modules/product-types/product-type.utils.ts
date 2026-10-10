import type { PublicProductType } from "@outfiqe/types";

import type { ProductTypeRecord, ProductTypeWithFitSupport } from "./product-type.types.js";

export const toPublicProductType = (productType: ProductTypeRecord): PublicProductType => ({
  id: productType.id,
  slug: productType.slug,
  label: productType.label,
});

export const toProductTypeWithFitSupport = (
  productType: ProductTypeRecord,
): ProductTypeWithFitSupport => ({
  ...toPublicProductType(productType),
  supportsFitRanges: productType.supportsFitRanges,
});
