import type { CollectionStatus } from "../../generated/prisma/enums.js";
import type { PublicProduct } from "../products/product.types.js";

export type CollectionRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  status: CollectionStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CollectionWithProductCount = CollectionRecord & { productCount: number };

export type CreateCollectionInput = {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
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
