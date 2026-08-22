import { getAvatarColor } from "@outfiqe/utils";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";

import { cn } from "@/shared/lib/cn";

import type { CreatorLeaderboardEntry } from "../api/creatorLeaderboardSchemas";

type CreatorLeaderboardRowProps = {
  entry: CreatorLeaderboardEntry;
};

export const CreatorLeaderboardRow = ({ entry }: CreatorLeaderboardRowProps) => {
  const { rank, creatorHandle, creatorName, avatarUrl, scoreLabel, movement } = entry;

  return (
    <Link
      href={`/creator/${creatorHandle}`}
      className="flex items-center gap-4 border-b border-border px-4 py-4 transition-colors last:border-b-0 hover:bg-muted"
    >
      <span className="w-8 shrink-0 text-center font-display text-lg font-extrabold text-muted-foreground">
        {String(rank).padStart(2, "0")}
      </span>

      <span
        className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cover bg-center text-xs font-bold text-white"
        style={
          avatarUrl
            ? { backgroundImage: `url(${avatarUrl})` }
            : { backgroundColor: getAvatarColor(entry.creatorId) }
        }
      >
        {!avatarUrl && creatorName.charAt(0).toUpperCase()}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground">{creatorName}</span>
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
