import type { CommissionSource, CommissionStatus } from "#generated/prisma/enums.js";

import type { CreatorCommissionView } from "./commission.types.js";

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
