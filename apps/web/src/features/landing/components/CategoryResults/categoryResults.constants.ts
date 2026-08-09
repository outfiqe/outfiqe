import type { ProductType } from "../ProductCard";

export interface ProductTypeFilter {
  id: "all" | ProductType;
  label: string;
}

export const PRODUCT_TYPE_FILTERS: ProductTypeFilter[] = [
  { id: "all", label: "All" },
  { id: "tops", label: "Tops" },
  { id: "bottoms", label: "Bottoms" },
  { id: "pants", label: "Pants" },
  { id: "headwear", label: "Headwear" },
  { id: "outerwear", label: "Outerwear" },
  { id: "dresses", label: "Dresses" },
];
