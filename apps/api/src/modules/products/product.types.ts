import type { ProductStatus, ProductType } from "#generated/prisma/enums.js";

import type { ProductTypeSlug } from "./product.constants.js";

export type ProductRecord = {
  id: string;
  brandId: string;
  name: string;
  price: number;
  type: ProductType;
  imageUrl: string | null;
  lowStock: boolean;
  status: ProductStatus;
  reviewedAt: Date | null;
  reviewedById: string | null;
  wornByCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductSizeRecord = {
  label: string;
  inStock: boolean;
};

export type SeenOnCreator = {
  creatorId: string;
  name: string;
  handle: string;
  heightCm: number | null;
  sizeWorn: string | null;
  lookId: string;
  lookImageUrl: string;
};

export type ProductWithBrand = ProductRecord & {
  brand: { name: string };
  categories: { slug: string; name: string }[];
};

export type ProductWithStock = ProductWithBrand & { totalStock: number };

export type ProductWithOptionalStock = ProductWithBrand & { totalStock?: number };

export type ProductReviewSummary = Omit<ProductWithBrand, "categories"> & { categories: string[] };

export type ProductReviewPage = {
  products: ProductReviewSummary[];
  nextCursor: string | null;
};

export type ProductBrandSummary = {
  id: string;
  name: string;
  price: number;
  type: ProductTypeSlug;
  categories: string[];
  imageUrl: string | null;
  lowStock: boolean;
  status: ProductStatus;
  createdAt: Date;
};

export type ProductBrandSummaryPage = {
  products: ProductBrandSummary[];
  nextCursor: string | null;
};

export type CreateProductInput = {
  brandId: string;
  name: string;
  price: number;
  type: ProductType;
  categoryIds: string[];
  imageUrls?: string[];
  lowStock?: boolean;
};

export type UpdateProductInput = Partial<Omit<CreateProductInput, "brandId">>;

export type PublicProduct = {
  id: string;
  brand: string;
  name: string;
  price: number;
  type: ProductTypeSlug;
  categorySlugs: string[];
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

export type PublicProductDetail = Omit<PublicProduct, "brand"> & {
  brand: { id: string; name: string };
  sizes: ProductSizeRecord[];
  images: string[];
  wornByCount: number;
  seenOnCreators: SeenOnCreator[];
  isSaved: boolean;
};

export type PublicProductType = {
  slug: ProductTypeSlug;
  label: string;
};
