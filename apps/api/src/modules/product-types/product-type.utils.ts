import type { PublicProductType } from "@outfiqe/types";

import type { AssignableProductType, ProductTypeRecord } from "./product-type.types.js";

export const toPublicProductType = (productType: ProductTypeRecord): PublicProductType => ({
  id: productType.id,
  slug: productType.slug,
  label: productType.label,
});

export const toAssignableProductType = (productType: ProductTypeRecord): AssignableProductType => ({
  ...toPublicProductType(productType),
  supportsFitRanges: productType.supportsFitRanges,
});
