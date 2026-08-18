import { getAvatarColor } from "@outfiqe/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";

import { cn } from "@/shared/lib/cn";

import type { LeaderboardEntry } from "../api/leaderboardSchemas";

const TOP_RANK_THRESHOLD = 3;

type LeaderboardRowProps = {
  entry: LeaderboardEntry;
};

export const LeaderboardRow = ({ entry }: LeaderboardRowProps) => {
  const { rank, brandId, brandName, avatarUrl, scoreLabel, movement } = entry;
  const isTopRank = rank <= TOP_RANK_THRESHOLD;

  return (
    <Link
      href={`/brand/${brandId}`}
      className="flex items-center gap-4 border-b border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-muted"
    >
      <span
        className={cn(
          "w-8 shrink-0 font-display text-lg font-extrabold",
          isTopRank ? "text-primary" : "text-muted-foreground",
        )}
      >
        {String(rank).padStart(2, "0")}
      </span>

      <span
        className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cover bg-center text-xs font-bold text-white"
        style={
          avatarUrl
            ? { backgroundImage: `url(${avatarUrl})` }
            : { backgroundColor: getAvatarColor(brandId) }
        }
      >
        {!avatarUrl && brandName.charAt(0).toUpperCase()}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{brandName}</span>
        <span className="block text-xs text-muted-foreground">{scoreLabel}</span>
      </span>

      <span
        className={cn(
          "flex shrink-0 items-center gap-1 text-xs font-semibold",
          movement === null || movement === 0
            ? "text-muted-foreground"
            : movement > 0
              ? "text-emerald-600"
              : "text-red-600",
        )}
      >
        {movement === null && "New"}
        {movement === 0 && <Minus className="size-3.5" />}
        {movement !== null && movement > 0 && (
          <>
            <TrendingUp className="size-3.5" />
            {movement}
          </>
        )}
        {movement !== null && movement < 0 && (
          <>
            <TrendingDown className="size-3.5" />
            {Math.abs(movement)}
          </>
        )}
      </span>
    </Link>
  );
};
