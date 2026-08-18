import { Flame } from "lucide-react";

import { cn } from "@/shared/lib/cn";

export const TRENDING_RANKS = [1, 2, 3] as const;
export type TrendingRank = (typeof TRENDING_RANKS)[number];

export const TOP_TRENDING_RANK: TrendingRank = TRENDING_RANKS[0];

type RankTier = {
  ordinal: string;
  medallionClassName: string;
  flameClassName: string;
  numeralClassName: string;
  ringClassName: string;
  tintClassName: string;
  glowShadow: string;
};

const RANK_TIERS: Record<TrendingRank, RankTier> = {
  1: {
    ordinal: "1st",
    medallionClassName: "bg-gradient-to-br from-[#ffe9a8] via-[#f0be4d] to-[#c98a1f]",
    flameClassName: "fill-[#8a4f06] text-[#8a4f06]",
    numeralClassName: "bg-[#4a2e05] text-[#ffe9a8]",
    ringClassName: "ring-[#e3a93b]",
    tintClassName: "border-[#e3a93b]/50 bg-[#e3a93b]/12 text-[#8a5c10]",
    glowShadow: "0 0 0 1px rgba(227,169,59,0.4), 0 0 22px -2px rgba(227,169,59,0.65)",
  },
  2: {
    ordinal: "2nd",
    medallionClassName: "bg-gradient-to-br from-[#f5f7f8] via-[#d3d9de] to-[#9aa5b1]",
    flameClassName: "fill-[#525a62] text-[#525a62]",
    numeralClassName: "bg-[#2a2e33] text-[#f5f7f8]",
    ringClassName: "ring-[#b7c0c9]",
    tintClassName: "border-[#9aa5b1]/50 bg-[#9aa5b1]/12 text-[#5a636c]",
    glowShadow: "0 0 0 1px rgba(154,165,177,0.4), 0 4px 14px -4px rgba(120,130,140,0.5)",
  },
  3: {
    ordinal: "3rd",
    medallionClassName: "bg-gradient-to-br from-[#eec49a] via-[#cf8d54] to-[#96501f]",
    flameClassName: "fill-[#5c2f0d] text-[#5c2f0d]",
    numeralClassName: "bg-[#3a1e0a] text-[#eec49a]",
    ringClassName: "ring-[#b06b34]",
    tintClassName: "border-[#b06b34]/50 bg-[#b06b34]/12 text-[#7a4a24]",
    glowShadow: "0 0 0 1px rgba(176,107,52,0.4), 0 4px 14px -4px rgba(150,80,31,0.5)",
  },
};

export const trendingRankRingClassName = (rank: TrendingRank): string =>
  cn("ring-2 ring-offset-2 ring-offset-background", RANK_TIERS[rank].ringClassName);

export const trendingRankTintClassName = (rank: TrendingRank): string =>
  RANK_TIERS[rank].tintClassName;

type TrendingRankBadgeProps = {
  rank: TrendingRank;
  className?: string;
};

export const TrendingRankBadge = ({ rank, className }: TrendingRankBadgeProps) => {
  const tier = RANK_TIERS[rank];
  const isTopRank = rank === TOP_TRENDING_RANK;

  return (
    <span className={cn("absolute left-3 top-3", className)}>
      {isTopRank && (
        <span
          aria-hidden
          className="motion-safe:animate-pulse absolute inset-0 -m-1 rounded-full bg-[#e3a93b]/50 blur-md"
        />
      )}
      <span
        aria-label={`Trending, ${tier.ordinal} place`}
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full ring-1 ring-inset ring-white/60",
          tier.medallionClassName,
        )}
        style={{ boxShadow: tier.glowShadow }}
      >
        <Flame className={cn("size-4.5", tier.flameClassName)} />
        <span
          className={cn(
            "absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full font-display text-[9px] font-bold ring-2 ring-background",
            tier.numeralClassName,
          )}
        >
          {rank}
        </span>
      </span>
    </span>
  );
};

type TrendingRankChipProps = {
  rank: TrendingRank;
  className?: string;
};

export const TrendingRankChip = ({ rank, className }: TrendingRankChipProps) => {
  const tier = RANK_TIERS[rank];

  return (
    <span
      aria-hidden
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-white/60",
        tier.medallionClassName,
        className,
      )}
    >
      <Flame className={cn("size-2.5", tier.flameClassName)} />
    </span>
  );
};
