import { HTTP_STATUS } from "#constants/http.constants.js";
import {
  type CommissionScope,
  CommissionStatus,
  OutfitOfferPayoutStatus,
} from "#generated/prisma/enums.js";
import { requireBrandId } from "#lib/brand-guard.utils.js";
import { isCommissionEarner, requireCommissionEarner } from "#lib/creator-guard.utils.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { isForeignKeyConstraintError } from "#lib/prisma.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { outfitOfferRepository } from "#modules/outfit-offers/outfit-offer.repository.js";
import { PLATFORM_AUDIT_ACTION } from "#modules/platform-audit/platform-audit.constants.js";
import { platformAudit } from "#modules/platform-audit/platform-audit.service.js";

import { COMMISSION_TIER_AUDIT_TARGET_TYPE } from "./commission.constants.js";
import { commissionRepository } from "./commission.repository.js";
import type {
  CreateCommissionTierBody,
  ListAdminCommissionsQuery,
  ListCommissionTierHistoryQuery,
  ListEarningsQuery,
  UpdateCommissionTierBody,
} from "./commission.schemas.js";
import type {
  AdminCommissionView,
  CommissionTierAdminView,
  CommissionTierChangeView,
  CommissionTierPriceTest,
  CommissionTierRow,
  CreatorCommissionView,
  CreatorEarningsSummary,
} from "./commission.types.js";
import {
  findOverlappingTierIds,
  parseCommissionTierRow,
  toAdminCommissionView,
  toCreatorCommissionView,
} from "./commission.utils.js";

const NO_EARNINGS = 0;
const NO_COMMISSION_AMOUNT = 0;
const NOT_AN_EARNER_MESSAGE = "You don't have any commission earnings yet.";
const AUDIT_SCOPE_KEY = "scope";

const requireTier = async (id: string, scope: CommissionScope): Promise<CommissionTierRow> => {
  const tier = await commissionRepository.findTierById(id);
  if (!tier || tier.scope !== scope) {
    throw new AppError("TIER_NOT_FOUND", "Commission tier not found.", HTTP_STATUS.NOT_FOUND);
  }
  return tier;
};

const describeTier = ({ minPrice, maxPrice, amount }: CommissionTierRow): string =>
  `Rs. ${minPrice}–${maxPrice === null ? "and above" : `Rs. ${maxPrice}`} pays Rs. ${amount}`;

const recordTierChange = async (
  adminUserId: string,
  action: string,
  summary: string,
  { before, after }: { before: CommissionTierRow | null; after: CommissionTierRow | null },
): Promise<void> => {
  const changedTier = after ?? before;
  if (!changedTier) return;
  await platformAudit.record({
    actorUserId: adminUserId,
    action,
    summary,
    targetType: COMMISSION_TIER_AUDIT_TARGET_TYPE,
    targetId: changedTier.id,
    metadata: { [AUDIT_SCOPE_KEY]: changedTier.scope, before, after },
  });
};

const toTierChangeView = (entry: {
  id: string;
  action: string;
  actorName: string | null;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}): CommissionTierChangeView => {
  const { id, action, actorName, summary, metadata, createdAt } = entry;
  return {
    id,
    action,
    actorName,
    summary,
    before: parseCommissionTierRow(metadata.before),
    after: parseCommissionTierRow(metadata.after),
    createdAt: createdAt.toISOString(),
  };
};

const summarizeEarnings = (
  sums: Partial<Record<CommissionStatus, number>>,
): CreatorEarningsSummary => {
  const pending =
    (sums[CommissionStatus.PENDING] ?? NO_EARNINGS) +
    (sums[CommissionStatus.APPROVED] ?? NO_EARNINGS);
  const available = sums[CommissionStatus.AVAILABLE] ?? NO_EARNINGS;
  const paid = sums[CommissionStatus.PAID] ?? NO_EARNINGS;
  return { totalEarnings: pending + available + paid, pending, available, paid };
};

export const commissionService = {
  async getEarnerEligibility(userId: string): Promise<{ canEarn: boolean }> {
    return { canEarn: await isCommissionEarner(userId) };
  },

  async getEarningsSummary(userId: string): Promise<CreatorEarningsSummary> {
    await requireCommissionEarner(userId, NOT_AN_EARNER_MESSAGE);
    const [commissionSums, offerPayoutSums, postedOfferTotal] = await Promise.all([
      commissionRepository.sumByStatusForCreator(userId),
      outfitOfferRepository.sumPayoutsByStatusForCreator(userId),
      outfitOfferRepository.sumPostedForCreator(userId),
    ]);
    const commissionSummary = summarizeEarnings(commissionSums);
    const pending = commissionSummary.pending + postedOfferTotal;
    const available =
      commissionSummary.available +
      (offerPayoutSums[OutfitOfferPayoutStatus.AVAILABLE] ?? NO_EARNINGS);
    const paid =
      commissionSummary.paid + (offerPayoutSums[OutfitOfferPayoutStatus.PAID] ?? NO_EARNINGS);
    return { totalEarnings: pending + available + paid, pending, available, paid };
  },

  async listEarnings(
    userId: string,
    { cursor, limit }: ListEarningsQuery,
  ): Promise<{ items: CreatorCommissionView[]; nextCursor: string | null }> {
    await requireCommissionEarner(userId, NOT_AN_EARNER_MESSAGE);
    const rows = await commissionRepository.listForCreator(userId, { cursor, limit });
    const { items: pagedRows, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);

    return { items: pagedRows.map(toCreatorCommissionView), nextCursor };
  },

  async getBrandBuildEarningsSummary(userId: string): Promise<CreatorEarningsSummary> {
    const brandId = await requireBrandId(userId);
    return summarizeEarnings(await commissionRepository.sumByStatusForBrand(brandId));
  },

  async listBrandBuildEarnings(
    userId: string,
    { cursor, limit }: ListEarningsQuery,
  ): Promise<{ items: CreatorCommissionView[]; nextCursor: string | null }> {
    const brandId = await requireBrandId(userId);
    const rows = await commissionRepository.listForBrand(brandId, { cursor, limit });
    const { items: pagedRows, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);

    return { items: pagedRows.map(toCreatorCommissionView), nextCursor };
  },

  async listTiers(scope: CommissionScope): Promise<CommissionTierAdminView[]> {
    const tiers = await commissionRepository.listTiers(scope);
    const overlapsByTierId = findOverlappingTierIds(tiers);
    return tiers.map((tier) => ({
      ...tier,
      overlapsWithTierIds: overlapsByTierId.get(tier.id) ?? [],
    }));
  },

  async testTierPrice(scope: CommissionScope, price: number): Promise<CommissionTierPriceTest> {
    const tier = await commissionRepository.findTierForPrice(price, scope);
    return { price, tierId: tier?.id ?? null, amount: tier?.amount ?? NO_COMMISSION_AMOUNT };
  },

  async listTierHistory({ scope, cursor, limit }: ListCommissionTierHistoryQuery): Promise<{
    items: CommissionTierChangeView[];
    nextCursor: string | null;
  }> {
    const { entries, nextCursor } = await platformAudit.list({
      targetType: COMMISSION_TIER_AUDIT_TARGET_TYPE,
      metadataMatch: { key: AUDIT_SCOPE_KEY, value: scope },
      cursor,
      limit,
    });
    return { items: entries.map(toTierChangeView), nextCursor };
  },

  async createTier(
    input: CreateCommissionTierBody,
    scope: CommissionScope,
    adminUserId: string,
  ): Promise<CommissionTierRow> {
    const tier = await commissionRepository.createTier(input, scope);
    await recordTierChange(
      adminUserId,
      PLATFORM_AUDIT_ACTION.COMMISSION_TIER_CREATED,
      `Added a ${scope} commission tier: ${describeTier(tier)}`,
      { before: null, after: tier },
    );
    return tier;
  },

  async updateTier(
    id: string,
    scope: CommissionScope,
    input: UpdateCommissionTierBody,
    adminUserId: string,
  ): Promise<CommissionTierRow> {
    const tier = await requireTier(id, scope);

    const minPrice = input.minPrice ?? tier.minPrice;
    const maxPrice = input.maxPrice !== undefined ? input.maxPrice : tier.maxPrice;
    if (maxPrice !== null && maxPrice <= minPrice) {
      throw new AppError(
        "INVALID_TIER_RANGE",
        "Max price must be greater than min price.",
        HTTP_STATUS.CONFLICT,
      );
    }

    const updatedTier = await commissionRepository.updateTier(id, input);
    await recordTierChange(
      adminUserId,
      PLATFORM_AUDIT_ACTION.COMMISSION_TIER_UPDATED,
      `Changed a ${tier.scope} commission tier to: ${describeTier(updatedTier)}`,
      { before: tier, after: updatedTier },
    );
    return updatedTier;
  },

  async deleteTier(id: string, scope: CommissionScope, adminUserId: string): Promise<void> {
    const tier = await requireTier(id, scope);

    try {
      await commissionRepository.deleteTier(id);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw new AppError(
          "TIER_IN_USE",
          "This tier has commissions attached and can't be deleted.",
          HTTP_STATUS.CONFLICT,
        );
      }
      throw error;
    }
    await recordTierChange(
      adminUserId,
      PLATFORM_AUDIT_ACTION.COMMISSION_TIER_DELETED,
      `Removed a ${tier.scope} commission tier: ${describeTier(tier)}`,
      { before: tier, after: null },
    );
  },

  async listAll(
    query: ListAdminCommissionsQuery,
  ): Promise<{ items: AdminCommissionView[]; nextCursor: string | null }> {
    const rows = await commissionRepository.listAllAdmin(query);
    const { items: pagedRows, nextCursor } = buildCursorPage(rows, query.limit, (row) => row.id);

    return { items: pagedRows.map(toAdminCommissionView), nextCursor };
  },

  async approve(id: string, adminUserId: string): Promise<void> {
    const approved = await commissionRepository.approve(id);
    if (!approved) {
      throw new AppError(
        "INVALID_TRANSITION",
        "Only pending commissions can be approved.",
        HTTP_STATUS.CONFLICT,
      );
    }
    logger.info(`Commission ${id} manually approved by admin ${adminUserId}`);
  },

  async void(id: string, reason: string, adminUserId: string): Promise<void> {
    const voided = await commissionRepository.adminVoid(id, reason);
    if (!voided) {
      throw new AppError(
        "INVALID_TRANSITION",
        "This commission can no longer be voided.",
        HTTP_STATUS.CONFLICT,
      );
    }
    logger.info(`Commission ${id} voided by admin ${adminUserId}: ${reason}`);
  },

  async markPaid(id: string, adminUserId: string): Promise<void> {
    const paid = await commissionRepository.markPaid(id);
    if (!paid) {
      throw new AppError(
        "INVALID_TRANSITION",
        "Only available commissions can be marked paid.",
        HTTP_STATUS.CONFLICT,
      );
    }
    logger.info(`Commission ${id} marked paid by admin ${adminUserId}`);
  },
};
