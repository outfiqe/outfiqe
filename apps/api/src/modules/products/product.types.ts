import type { ProductStatus, ProductType } from "#generated/prisma/enums.js";

import type { ProductTypeSlug } from "./product.constants.js";

export type ProductRatingSummary = {
  avgRating: number | null;
  reviewCount: number;
  rating1Count: number;
  rating2Count: number;
  rating3Count: number;
  rating4Count: number;
  rating5Count: number;
};

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
  deletedAt: Date | null;
} & ProductRatingSummary;

export type ProductSizeRecord = {
  id: string;
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

export type BrandProductSize = { id: string; label: string; stock: number };

export type ProductWithStockAndSizes = ProductWithStock & { sizes: BrandProductSize[] };

export type ProductWithStockSizesAndImages = ProductWithStockAndSizes & {
  images: { url: string }[];
};

export type ProductSalesStats = { creatorBuyerCount: number; unitsSold: number };

export type ProductWithOptionalStock = ProductWithBrand &
  Partial<ProductSalesStats> & { totalStock?: number };

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
  categorySlugs: string[];
  imageUrl: string | null;
  imageUrls: string[];
  lowStock: boolean;
  status: ProductStatus;
  createdAt: Date;
  sizes: BrandProductSize[];
};

export type ProductBrandSummaryPage = {
  products: ProductBrandSummary[];
  nextCursor: string | null;
};

export type CreateProductSizeInput = {
  label: string;
  stock: number;
  sortOrder: number;
};

export type CreateProductInput = {
  brandId: string;
  name: string;
  price: number;
  type: ProductType;
  categoryIds: string[];
  imageUrls?: string[];
  lowStock?: boolean;
  sizes: CreateProductSizeInput[];
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
  creatorBuyerCount: number;
  unitsSold: number;
} & ProductRatingSummary;

export type PublicProductPage = {
  products: PublicProduct[];
  nextCursor: string | null;
  total: number;
  brandCount: number;
};

export type ProductSearchFilter = {
  categoryId?: string;
  type?: ProductType;
  brandId?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
};

export type ProductSearchParams = ProductSearchFilter & {
  query: string;
  limit: number;
  offset: number;
};

export type ProductSearchResult = {
  ids: string[];
  total: number;
  brandCount: number;
};

export type ProductSearchCursor = { offset: number };

export type ProductSuggestion = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string | null;
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
