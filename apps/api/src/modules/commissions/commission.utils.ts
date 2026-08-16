import type { CommissionSource, CommissionStatus } from "#generated/prisma/enums.js";

import type { AdminCommissionView, CreatorCommissionView } from "./commission.types.js";

type CreatorCommissionRow = {
  id: string;
  source: CommissionSource;
  status: CommissionStatus;
  amount: number;
  createdAt: Date;
  orderItem: {
    product: { name: string; imageUrl: string | null; brand: { name: string } };
  };
};

export const toCreatorCommissionView = (row: CreatorCommissionRow): CreatorCommissionView => {
  const { id, source, status, amount, createdAt, orderItem } = row;
  const { product } = orderItem;

  return {
    id,
    source,
    status,
    amount,
    createdAt: createdAt.toISOString(),
    productName: product.name,
    brandName: product.brand.name,
    imageUrl: product.imageUrl,
  };
};

type AdminCommissionRow = {
  id: string;
  source: CommissionSource;
  status: CommissionStatus;
  amount: number;
  createdAt: Date;
  creator: { name: string };
  orderItem: {
    product: { name: string; brand: { name: string } };
  };
};

export const toAdminCommissionView = (row: AdminCommissionRow): AdminCommissionView => {
  const { id, source, status, amount, createdAt, creator, orderItem } = row;
  const { product } = orderItem;

  return {
    id,
    source,
    status,
    amount,
    createdAt: createdAt.toISOString(),
    creatorName: creator.name,
    productName: product.name,
    brandName: product.brand.name,
  };
};
