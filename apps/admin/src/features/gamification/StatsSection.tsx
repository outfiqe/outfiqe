import { useQuery } from "@tanstack/react-query";

import { StatCard } from "@/features/trending/TrendStatCards";

import { gamificationApi } from "./api";

export const StatsSection = () => {
  const { data: xpStats } = useQuery({
    queryKey: ["admin-xp-stats"],
    queryFn: gamificationApi.getXpStats,
  });
  const { data: badgeStats } = useQuery({
    queryKey: ["admin-badge-stats"],
    queryFn: gamificationApi.getBadgeStats,
  });

  return (
    <div>
      <h2 className="font-display text-lg font-bold text-foreground">Overview</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
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
      </div>
    </div>
  );
};
