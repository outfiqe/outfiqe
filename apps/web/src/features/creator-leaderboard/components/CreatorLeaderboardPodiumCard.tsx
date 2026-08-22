import { getAvatarColor } from "@outfiqe/utils";
import Link from "next/link";

import { cn } from "@/shared/lib/cn";

import type { CreatorLeaderboardEntry } from "../api/creatorLeaderboardSchemas";

const RANK_LABEL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };

const RANK_BADGE_STYLE: Record<number, string> = {
  1: "bg-primary text-primary-foreground",
  2: "bg-foreground text-background",
  3: "bg-muted-foreground text-background",
};

const RANK_BANNER_STYLE: Record<number, string> = {
  1: "bg-gradient-to-br from-primary/80 via-primary to-primary-strong",
  2: "bg-gradient-to-br from-foreground/60 via-foreground to-foreground",
  3: "bg-gradient-to-br from-muted-foreground/60 via-muted-foreground to-muted-foreground",
};

type CreatorLeaderboardPodiumCardProps = {
  entry: CreatorLeaderboardEntry;
};

export const CreatorLeaderboardPodiumCard = ({ entry }: CreatorLeaderboardPodiumCardProps) => {
  const { rank, creatorId, creatorHandle, creatorName, avatarUrl, scoreLabel } = entry;

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      <div className={cn("relative h-20 bg-cover bg-center", RANK_BANNER_STYLE[rank])}>
        <span
          className={cn(
            "absolute right-3 top-3 rounded-full px-2.5 py-1 font-display text-xs font-extrabold",
            RANK_BADGE_STYLE[rank],
          )}
        >
          {RANK_LABEL[rank]}
        </span>
      </div>

      <div className="flex flex-col items-center px-5 pb-5 text-center">
        <span
          className="relative z-10 -mt-8 flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cover bg-center text-lg font-bold text-white ring-4 ring-card"
          style={
            avatarUrl
              ? { backgroundImage: `url(${avatarUrl})` }
              : { backgroundColor: getAvatarColor(creatorId) }
          }
        >
          {!avatarUrl && creatorName.charAt(0).toUpperCase()}
        </span>

        <p className="mt-3 truncate font-display text-base font-extrabold uppercase tracking-tight text-foreground">
          {creatorName}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{scoreLabel}</p>

        <Link
          href={`/creator/${creatorHandle}`}
          className="mt-4 w-full rounded-full border border-foreground px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          View creator
        </Link>
      </div>
    </div>
  );
};
