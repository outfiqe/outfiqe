import {
  CommissionScope,
  type CommissionSource,
  type CommissionStatus,
} from "#generated/prisma/enums.js";

import { COMMISSION_RECIPIENT_KIND } from "./commission.constants.js";
import type {
  AdminCommissionView,
  CommissionTierRow,
  CreatorCommissionView,
} from "./commission.types.js";

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
  creator: { name: string } | null;
  recipientBrand: { name: string } | null;
  orderItem: {
    product: { name: string; brand: { name: string } };
  };
};

const UNKNOWN_RECIPIENT_NAME = "Unknown";

export const toAdminCommissionView = (row: AdminCommissionRow): AdminCommissionView => {
  const { id, source, status, amount, createdAt, creator, recipientBrand, orderItem } = row;
  const { product } = orderItem;

  return {
    id,
    source,
    status,
    amount,
    createdAt: createdAt.toISOString(),
    recipientName: creator?.name ?? recipientBrand?.name ?? UNKNOWN_RECIPIENT_NAME,
    recipientKind: recipientBrand
      ? COMMISSION_RECIPIENT_KIND.BRAND
      : COMMISSION_RECIPIENT_KIND.PERSON,
    productName: product.name,
    brandName: product.brand.name,
  };
};

export type BuildCommissionShare = { contributorId: string; amount: number };

const NO_AMOUNT = 0;
const NO_CONTRIBUTORS = 0;
const EXTRA_RUPEE = 1;

export const splitBuildCommission = (
  amount: number,
  contributorIds: readonly string[],
  buyerId: string,
): BuildCommissionShare[] => {
  const contributors = [...new Set(contributorIds)];
  if (contributors.length === NO_CONTRIBUTORS || amount <= NO_AMOUNT) return [];

  const evenShare = Math.floor(amount / contributors.length);
  const leftoverRupees = amount - evenShare * contributors.length;

  return contributors
    .map((contributorId, position) => ({
      contributorId,
      amount: evenShare + (position < leftoverRupees ? EXTRA_RUPEE : NO_AMOUNT),
    }))
    .filter((share) => share.contributorId !== buyerId && share.amount > NO_AMOUNT);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isNumberOrNull = (value: unknown): value is number | null =>
  value === null || typeof value === "number";

export const parseCommissionTierRow = (value: unknown): CommissionTierRow | null => {
  if (!isRecord(value)) return null;
  const { id, scope, minPrice, maxPrice, amount, sortOrder } = value;
  const isTierScope =
    scope === CommissionScope.CREATOR_LOOK || scope === CommissionScope.OUTFIT_BUILD;
  if (
    typeof id !== "string" ||
    !isTierScope ||
    typeof minPrice !== "number" ||
    !isNumberOrNull(maxPrice) ||
    typeof amount !== "number" ||
    typeof sortOrder !== "number"
  ) {
    return null;
  }
  return { id, scope, minPrice, maxPrice, amount, sortOrder };
};

type TierPriceRange = Pick<CommissionTierRow, "id" | "minPrice" | "maxPrice">;

const doTierRangesOverlap = (first: TierPriceRange, second: TierPriceRange): boolean => {
  const firstEndsBeforeSecondStarts = first.maxPrice !== null && first.maxPrice < second.minPrice;
  const secondEndsBeforeFirstStarts = second.maxPrice !== null && second.maxPrice < first.minPrice;
  return !firstEndsBeforeSecondStarts && !secondEndsBeforeFirstStarts;
};

export const findOverlappingTierIds = (tiers: readonly TierPriceRange[]): Map<string, string[]> => {
  const overlapsByTierId = new Map<string, string[]>(tiers.map((tier) => [tier.id, []]));
  for (const tier of tiers) {
    for (const otherTier of tiers) {
      if (tier.id !== otherTier.id && doTierRangesOverlap(tier, otherTier)) {
        overlapsByTierId.get(tier.id)?.push(otherTier.id);
      }
    }
  }
  return overlapsByTierId;
};
