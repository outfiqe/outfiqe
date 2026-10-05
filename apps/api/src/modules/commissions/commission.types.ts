import type {
  CommissionScope,
  CommissionSource,
  CommissionStatus,
} from "#generated/prisma/enums.js";

import type { COMMISSION_RECIPIENT_KIND } from "./commission.constants.js";

export type CommissionTierRecord = {
  id: string;
  minPrice: number;
  maxPrice: number | null;
  amount: number;
};

export type CommissionRecipient = { creatorId: string } | { recipientBrandId: string };

export type CommissionShare = CommissionRecipient & { amount: number };

export type CreatePendingCommissionInput = CommissionRecipient & {
  orderItemId: string;
  source: CommissionSource;
  tagClickId?: string;
  linkClickId?: string;
  buildVisitId?: string;
  tierId: string;
  amount: number;
};

export type AvailableLedgerRow = { id: string; amount: number; createdAt: Date };

export type CommissionRecipientKind =
  (typeof COMMISSION_RECIPIENT_KIND)[keyof typeof COMMISSION_RECIPIENT_KIND];

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

export type CommissionTierRow = {
  id: string;
  scope: CommissionScope;
  minPrice: number;
  maxPrice: number | null;
  amount: number;
  sortOrder: number;
};

export type CommissionTierAdminView = CommissionTierRow & {
  overlapsWithTierIds: string[];
};

export type CommissionTierPriceTest = {
  price: number;
  tierId: string | null;
  amount: number;
};

export type CommissionTierChangeView = {
  id: string;
  action: string;
  actorName: string | null;
  summary: string;
  before: CommissionTierRow | null;
  after: CommissionTierRow | null;
  createdAt: string;
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
  recipientName: string;
  recipientKind: CommissionRecipientKind;
  productName: string;
  brandName: string;
  source: CommissionSource;
  status: CommissionStatus;
  amount: number;
  createdAt: string;
};
