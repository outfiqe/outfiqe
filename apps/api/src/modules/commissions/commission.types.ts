import type { CommissionSource } from "#generated/prisma/enums.js";

export type CommissionTierRecord = {
  id: string;
  minPrice: number;
  maxPrice: number | null;
  amount: number;
};

export type CreatePendingCommissionInput = {
  creatorId: string;
  orderItemId: string;
  source: CommissionSource;
  tagClickId?: string;
  linkClickId?: string;
  tierId: string;
  amount: number;
};
