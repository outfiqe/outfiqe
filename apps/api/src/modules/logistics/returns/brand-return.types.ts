import type { BrandReturnSource, BrandReturnStatus } from "#generated/prisma/enums.js";

export type BrandReturnView = {
  id: string;
  orderId: string;
  source: BrandReturnSource;
  status: BrandReturnStatus;
  createdAt: string;
  droppedOffAt: string | null;
  confirmedAt: string | null;
  isAutoConfirmed: boolean;
  lines: { productName: string; sizeLabel: string; resellableQty: number; damagedQty: number }[];
};
