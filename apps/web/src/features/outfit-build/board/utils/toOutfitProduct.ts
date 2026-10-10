import type { PublicProduct } from "@/features/products/api/productSchemas";

import type { OutfitProduct } from "../../api/outfitSchemas";

export const toOutfitProduct = (product: PublicProduct, productTypeId: string): OutfitProduct => ({
  id: product.id,
  name: product.name,
  imageUrl: product.imageUrl,
  price: product.effectivePrice,
  listPrice: product.price,
  productTypeId,
  brand: { id: "", name: product.brand },
  availability: product.lowStock ? "LOW_STOCK" : "IN_STOCK",
  sizes: [],
});
