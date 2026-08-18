import { Flame } from "lucide-react";

import { cn } from "@/shared/lib/cn";

export const TRENDING_RANKS = [1, 2, 3] as const;
export type TrendingRank = (typeof TRENDING_RANKS)[number];

const TOP_TRENDING_RANK: TrendingRank = TRENDING_RANKS[0];

type TrendingRankBadgeProps = {
  rank: TrendingRank;
  className?: string;
};

export const TrendingRankBadge = ({ rank, className }: TrendingRankBadgeProps) => {
  const isTopRank = rank === TOP_TRENDING_RANK;

  return (
    <span
      aria-label={`Trending, rank ${rank}`}
      className={cn(
        "absolute left-3 top-3 flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
        isTopRank
          ? "bg-primary text-primary-foreground"
          : "bg-foreground/85 text-background backdrop-blur-sm",
        className,
      )}
    >
      {isTopRank && <Flame className="size-3" aria-hidden />}#{rank}
    </span>
  );
};
