import { CommissionStatus } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";
import { isForeignKeyConstraintError } from "#lib/prisma.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";

import { commissionRepository } from "./commission.repository.js";
import type {
  CreateCommissionTierBody,
  ListAdminCommissionsQuery,
  ListEarningsQuery,
  UpdateCommissionTierBody,
} from "./commission.schemas.js";
import type {
  AdminCommissionView,
  CommissionTierAdminView,
  CreatorCommissionView,
  CreatorEarningsSummary,
} from "./commission.types.js";
import { toAdminCommissionView, toCreatorCommissionView } from "./commission.utils.js";

const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

const requireTier = async (id: string): Promise<CommissionTierAdminView> => {
  const tier = await commissionRepository.findTierById(id);
  if (!tier) throw new AppError("TIER_NOT_FOUND", "Commission tier not found.", NOT_FOUND_STATUS);
  return tier;
};

export const commissionService = {
  async getEarningsSummary(creatorId: string): Promise<CreatorEarningsSummary> {
    const sums = await commissionRepository.sumByStatusForCreator(creatorId);
    const pending = sums[CommissionStatus.PENDING] ?? 0;
    const available = sums[CommissionStatus.AVAILABLE] ?? 0;
    const paid = sums[CommissionStatus.PAID] ?? 0;

    return { totalEarnings: pending + available + paid, pending, available, paid };
  },

  async listEarnings(
    creatorId: string,
    { cursor, limit }: ListEarningsQuery,
  ): Promise<{ items: CreatorCommissionView[]; nextCursor: string | null }> {
    const rows = await commissionRepository.listForCreator(creatorId, { cursor, limit });
    const { items: pagedRows, nextCursor } = buildCursorPage(rows, limit, (row) => row.id);

    return { items: pagedRows.map(toCreatorCommissionView), nextCursor };
  },

  async listTiers(): Promise<CommissionTierAdminView[]> {
    return commissionRepository.listTiers();
  },

  async createTier(input: CreateCommissionTierBody): Promise<CommissionTierAdminView> {
    return commissionRepository.createTier(input);
  },

  async updateTier(id: string, input: UpdateCommissionTierBody): Promise<CommissionTierAdminView> {
    const tier = await requireTier(id);

    const minPrice = input.minPrice ?? tier.minPrice;
    const maxPrice = input.maxPrice !== undefined ? input.maxPrice : tier.maxPrice;
    if (maxPrice !== null && maxPrice <= minPrice) {
      throw new AppError(
        "INVALID_TIER_RANGE",
        "Max price must be greater than min price.",
        CONFLICT_STATUS,
      );
    }

    return commissionRepository.updateTier(id, input);
  },

  async deleteTier(id: string): Promise<void> {
    await requireTier(id);

    try {
      await commissionRepository.deleteTier(id);
    } catch (error) {
      if (isForeignKeyConstraintError(error)) {
        throw new AppError(
          "TIER_IN_USE",
          "This tier has commissions attached and can't be deleted.",
          CONFLICT_STATUS,
        );
      }
      throw error;
    }
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
        CONFLICT_STATUS,
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
        CONFLICT_STATUS,
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
        CONFLICT_STATUS,
      );
    }
    logger.info(`Commission ${id} marked paid by admin ${adminUserId}`);
  },
};
