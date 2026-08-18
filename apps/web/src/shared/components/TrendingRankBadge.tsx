import { TrendingUp } from "lucide-react";

import { cn } from "@/shared/lib/cn";

export const TRENDING_RANKS = [1, 2, 3] as const;
export type TrendingRank = (typeof TRENDING_RANKS)[number];

export const TOP_TRENDING_RANK: TrendingRank = TRENDING_RANKS[0];

type TrendingRankBadgeProps = {
  rank: TrendingRank;
  className?: string;
};

export const TrendingRankBadge = ({ rank, className }: TrendingRankBadgeProps) => (
  <span
    aria-label={`Trending, rank ${rank}`}
    className={cn(
      "absolute left-3 top-3 flex items-center gap-1 rounded bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground",
      className,
    )}
  >
    <TrendingUp className="size-3" aria-hidden />
    {rank}
  </span>
);

type TrendingRankChipProps = {
  rank: TrendingRank;
  className?: string;
};

export const TrendingRankChip = ({ rank, className }: TrendingRankChipProps) => (
  <span
    aria-hidden
    className={cn(
      "flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground",
      className,
    )}
  >
    <TrendingUp className="size-2.5" aria-hidden />
    {rank}
  </span>
);
