import type { ProductStatus, ProductType, TasteCategory } from "../../generated/prisma/enums.js";
import type { ProductTypeSlug, TasteCategorySlug } from "./product.constants.js";

export type ProductRecord = {
  id: string;
  brandId: string;
  name: string;
  price: number;
  type: ProductType;
  category: TasteCategory;
  imageUrl: string | null;
  lowStock: boolean;
  status: ProductStatus;
  reviewedAt: Date | null;
  reviewedById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductWithBrand = ProductRecord & { brand: { name: string } };

export type CreateProductInput = {
  brandId: string;
  name: string;
  price: number;
  type: ProductType;
  category: TasteCategory;
  imageUrl?: string;
  lowStock?: boolean;
};

export type UpdateProductInput = Partial<Omit<CreateProductInput, "brandId">>;

export type PublicProduct = {
  id: string;
  brand: string;
  name: string;
  price: number;
  type: ProductTypeSlug;
  categorySlug: TasteCategorySlug;
  imageUrl: string | null;
  lowStock: boolean;
  isNew: boolean;
};

export type PublicProductPage = {
  products: PublicProduct[];
  nextCursor: string | null;
  total: number;
  brandCount: number;
};
