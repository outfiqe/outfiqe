import type { ResponsiveImage } from "@outfiqe/types";

import type { CollectionStatus } from "#generated/prisma/enums.js";
import type { ImageAssetForResponsiveImage } from "#lib/responsive-image.utils.js";
import type { PublicProduct } from "#modules/products/product.types.js";

export type CollectionRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  imageAssetId: string | null;
  status: CollectionStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CollectionWithProductCount = CollectionRecord & {
  productCount: number;
  imageAsset: ImageAssetForResponsiveImage | null;
};

export type CreateCollectionInput = {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  imageAssetId?: string | null;
  status?: CollectionStatus;
  sortOrder?: number;
};

export type UpdateCollectionInput = Partial<CreateCollectionInput>;

export type PublicCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  image: ResponsiveImage | null;
  productCount: number;
};

export type PublicCollectionPage = {
  collections: PublicCollection[];
  nextCursor: string | null;
  total: number;
};

export type PublicCollectionProductPage = {
  products: PublicProduct[];
  nextCursor: string | null;
  total: number;
};
