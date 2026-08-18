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
      "absolute left-2 top-2 flex size-6 items-center justify-center rounded bg-black/75 font-display text-xs font-bold text-white backdrop-blur-sm",
      className,
    )}
  >
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
      "flex size-4 shrink-0 items-center justify-center rounded-full bg-foreground font-display text-[9px] font-bold text-background",
      className,
    )}
  >
    {rank}
  </span>
);
