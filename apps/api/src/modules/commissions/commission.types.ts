import type { CommissionSource, CommissionStatus } from "#generated/prisma/enums.js";

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

export type CreatorCommissionView = {
  id: string;
  productName: string;
  brandName: string;
  imageUrl: string | null;
  source: CommissionSource;
  status: CommissionStatus;
  amount: number;
  createdAt: string;
};

export type CreatorEarningsSummary = {
  totalEarnings: number;
  pending: number;
  available: number;
  paid: number;
};

export type CommissionTierAdminView = {
  id: string;
  minPrice: number;
  maxPrice: number | null;
  amount: number;
  sortOrder: number;
};

export type CreateCommissionTierInput = {
  minPrice: number;
  maxPrice?: number;
  amount: number;
  sortOrder?: number;
};

export type UpdateCommissionTierInput = Partial<CreateCommissionTierInput>;

export type AdminCommissionView = {
  id: string;
  creatorName: string;
  productName: string;
  brandName: string;
  source: CommissionSource;
  status: CommissionStatus;
  amount: number;
  createdAt: string;
};
