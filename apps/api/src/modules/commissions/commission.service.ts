import { CommissionStatus } from "#generated/prisma/enums.js";
import { buildCursorPage } from "#lib/pagination.utils.js";

import { commissionRepository } from "./commission.repository.js";
import type { ListEarningsQuery } from "./commission.schemas.js";
import type { CreatorCommissionView, CreatorEarningsSummary } from "./commission.types.js";
import { toCreatorCommissionView } from "./commission.utils.js";

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
};
