import { CommissionStatus } from "#generated/prisma/enums.js";
import { requireApprovedCreator } from "#lib/creator-guard.utils.js";
import { commissionRepository } from "#modules/commissions/commission.repository.js";
import { toCreatorCommissionView } from "#modules/commissions/commission.utils.js";

import { RECENT_COMMISSION_LIMIT } from "./creator-overview.constants.js";
import { creatorOverviewRepository } from "./creator-overview.repository.js";
import type { CreatorOverview } from "./creator-overview.types.js";

const NOT_A_CREATOR_MESSAGE = "Only approved muses have a muse overview.";

export const creatorOverviewService = {
  async getOverview(creatorId: string, periodDays: number): Promise<CreatorOverview> {
    await requireApprovedCreator(creatorId, NOT_A_CREATOR_MESSAGE);

    const [
      statusSums,
      earningsWindows,
      lookAggregates,
      { followerCount, handle },
      trend,
      recentRows,
      topLooks,
      earningsBySource,
      nextAvailableAt,
    ] = await Promise.all([
      commissionRepository.sumByStatusForCreator(creatorId),
      creatorOverviewRepository.getEarningsWindows(creatorId, periodDays),
      creatorOverviewRepository.getLookAggregates(creatorId),
      creatorOverviewRepository.getCreatorProfile(creatorId),
      creatorOverviewRepository.getDailyTrend(creatorId, periodDays),
      commissionRepository.listForCreator(creatorId, { limit: RECENT_COMMISSION_LIMIT }),
      creatorOverviewRepository.getTopLooks(creatorId, periodDays),
      creatorOverviewRepository.getEarningsBySource(creatorId, periodDays),
      creatorOverviewRepository.findNextAvailableAt(creatorId),
    ]);

    const pendingEarnings =
      (statusSums[CommissionStatus.PENDING] ?? 0) + (statusSums[CommissionStatus.APPROVED] ?? 0);
    const availableEarnings = statusSums[CommissionStatus.AVAILABLE] ?? 0;
    const paidEarnings = statusSums[CommissionStatus.PAID] ?? 0;

    return {
      kpis: {
        totalEarnings: pendingEarnings + availableEarnings + paidEarnings,
        pendingEarnings,
        availableEarnings,
        periodDays,
        periodEarnings: earningsWindows.period,
        previousPeriodEarnings: earningsWindows.previousPeriod,
        lookCount: lookAggregates.lookCount,
        followerCount,
        totalLikes: lookAggregates.totalLikes,
      },
      trend,
      handle,
      nextAvailableAt,
      topLooks,
      earningsBySource,
      recentCommissions: recentRows.slice(0, RECENT_COMMISSION_LIMIT).map(toCreatorCommissionView),
    };
  },
};
