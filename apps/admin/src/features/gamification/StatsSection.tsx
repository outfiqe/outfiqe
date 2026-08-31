import { Skeleton } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";

import { StatCard } from "@/features/trending/TrendStatCards";

import { gamificationApi } from "./api";

const OVERVIEW_STAT_COUNT = 5;

export const StatsSection = () => {
  const { data: xpStats, isLoading: isXpStatsLoading } = useQuery({
    queryKey: ["admin-xp-stats"],
    queryFn: gamificationApi.getXpStats,
  });
  const { data: badgeStats, isLoading: isBadgeStatsLoading } = useQuery({
    queryKey: ["admin-badge-stats"],
    queryFn: gamificationApi.getBadgeStats,
  });

  const isLoading = isXpStatsLoading || isBadgeStatsLoading;

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Overview</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {isLoading ? (
          Array.from({ length: OVERVIEW_STAT_COUNT }).map((_, index) => (
            <Skeleton key={index} className="h-[88px] rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Total XP awarded"
              value={(xpStats?.totalXpAwarded ?? 0).toLocaleString()}
            />
            <StatCard label="Users with progress" value={String(xpStats?.usersWithProgress ?? 0)} />
            <StatCard label="Badges awarded" value={String(badgeStats?.totalBadgesAwarded ?? 0)} />
            <StatCard
              label="Achievements unlocked"
              value={String(badgeStats?.totalAchievementsUnlocked ?? 0)}
              hint={`${badgeStats?.totalManualAwards ?? 0} manual`}
            />
            <StatCard
              label="Most awarded badge"
              value={badgeStats?.mostAwardedBadge?.name ?? "—"}
              hint={
                badgeStats?.mostAwardedBadge
                  ? `${badgeStats.mostAwardedBadge.count} holders`
                  : undefined
              }
            />
          </>
        )}
      </div>
    </div>
  );
};
