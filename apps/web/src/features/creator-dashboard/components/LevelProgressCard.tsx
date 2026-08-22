import { ProgressBar, Skeleton } from "@outfiqe/design-system";

import type { XpProgress } from "../api/xpSchemas";

type LevelProgressCardProps = {
  progress: XpProgress | null | undefined;
  isLoading: boolean;
};

export const LevelProgressCard = ({ progress, isLoading }: LevelProgressCardProps) => {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-2 w-full rounded-full" />
        <Skeleton className="mt-2 h-3.5 w-32" />
      </div>
    );
  }

  const { totalXp, level, nextLevel, xpToNextLevel } = progress ?? {
    totalXp: 0,
    level: { id: "newcomer", level: 1, name: "Newcomer", requiredXp: 0, icon: null },
    nextLevel: null,
    xpToNextLevel: null,
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="font-display text-lg font-bold text-foreground">
          Level {level.level} — {level.name}
        </p>
        <p className="text-sm text-muted-foreground">
          {totalXp.toLocaleString()}
          {nextLevel && ` / ${nextLevel.requiredXp.toLocaleString()}`} XP
        </p>
      </div>

      <div className="mt-3">
        <ProgressBar
          label={`XP progress toward ${nextLevel ? `Level ${nextLevel.level}` : "the next level"}`}
          value={nextLevel ? totalXp - level.requiredXp : 1}
          max={nextLevel ? nextLevel.requiredXp - level.requiredXp : 1}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {nextLevel
          ? `${xpToNextLevel?.toLocaleString()} XP to Level ${nextLevel.level} — ${nextLevel.name}`
          : "You've reached the highest level."}
      </p>
    </div>
  );
};
