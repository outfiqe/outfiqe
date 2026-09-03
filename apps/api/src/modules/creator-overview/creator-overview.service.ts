import { CommissionStatus } from "#generated/prisma/enums.js";
import { requireApprovedCreator } from "#lib/creator-guard.utils.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";
import { toCreatorCommissionView } from "#modules/commissions/commission.utils.js";

import { RECENT_COMMISSION_LIMIT } from "./creator-overview.constants.js";
import { creatorOverviewRepository } from "./creator-overview.repository.js";
import type { CreatorOverview } from "./creator-overview.types.js";

const NOT_A_CREATOR_MESSAGE = "Only approved creators have a creator overview.";

export const creatorOverviewService = {
  async getOverview(creatorId: string): Promise<CreatorOverview> {
    await requireApprovedCreator(creatorId, NOT_A_CREATOR_MESSAGE);

    const [statusSums, earningsWindows, lookAggregates, followerCount, trend, recentRows] =
      await Promise.all([
        commissionRepository.sumByStatusForCreator(creatorId),
        creatorOverviewRepository.getEarningsWindows(creatorId),
        creatorOverviewRepository.getLookAggregates(creatorId),
        creatorOverviewRepository.getFollowerCount(creatorId),
        creatorOverviewRepository.getDailyTrend(creatorId),
        commissionRepository.listForCreator(creatorId, { limit: RECENT_COMMISSION_LIMIT }),
      ]);

    const pendingEarnings = statusSums[CommissionStatus.PENDING] ?? 0;
    const availableEarnings = statusSums[CommissionStatus.AVAILABLE] ?? 0;
    const paidEarnings = statusSums[CommissionStatus.PAID] ?? 0;

    return {
      kpis: {
        totalEarnings: pendingEarnings + availableEarnings + paidEarnings,
        pendingEarnings,
        availableEarnings,
        last30DaysEarnings: earningsWindows.last30,
        previous30DaysEarnings: earningsWindows.previous30,
        lookCount: lookAggregates.lookCount,
        followerCount,
        totalLikes: lookAggregates.totalLikes,
      },
      trend,
      recentCommissions: recentRows.slice(0, RECENT_COMMISSION_LIMIT).map(toCreatorCommissionView),
    };
  },
};
