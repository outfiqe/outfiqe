import type { ProductType } from "#generated/prisma/enums.js";

export type SizeOptionRecord = {
  id: string;
  type: ProductType;
  label: string;
  sortOrder: number;
  createdAt: Date;
};

export type CreateSizeOptionInput = {
  type: ProductType;
  label: string;
  sortOrder?: number;
};
