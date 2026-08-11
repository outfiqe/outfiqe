import type { CategoryStatus } from "../../generated/prisma/enums.js";

export type CategoryRecord = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  status: CategoryStatus;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryWithProductCount = CategoryRecord & { productCount: number };

export type CreateCategoryInput = {
  name: string;
  slug: string;
  imageUrl?: string;
  status?: CategoryStatus;
  sortOrder?: number;
};

export type UpdateCategoryInput = Partial<CreateCategoryInput>;

export type PublicCategory = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  productCount: number;
};
