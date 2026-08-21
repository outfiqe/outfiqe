"use client";

import { Badge, Button, ProgressBar, toast } from "@outfiqe/design-system";

import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { BadgeCollectionEntry } from "../api/badgeSchemas";
import { useUpdateBadgeDisplay } from "../hooks/useUpdateBadgeDisplay";
import { isRankMetric, METRIC_LABEL, RARITY_LABEL } from "../utils/badgeLabels";
import { AchievementBadgeIcon } from "./AchievementBadgeIcon";

type AchievementBadgeCardProps = {
  entry: BadgeCollectionEntry;
  isFeaturable: boolean;
  onToggleFeatured: (badgeId: string) => void;
};

export const AchievementBadgeCard = ({
  entry,
  isFeaturable,
  onToggleFeatured,
}: AchievementBadgeCardProps) => {
  const updateDisplay = useUpdateBadgeDisplay();
  const {
    id,
    name,
    description,
    rarity,
    icon,
    designConfig,
    isCollected,
    unlockedAt,
    isDisplayed,
    isFeatured,
    isDynamicallyActive,
    progress,
  } = entry;

  return (
    <div className="flex gap-3 rounded-2xl border border-border p-4">
      <AchievementBadgeIcon
        icon={icon}
        designConfig={designConfig}
        rarity={rarity}
        isLocked={!isCollected}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <Badge showDot={false} tone={isCollected ? "positive" : "neutral"}>
            {RARITY_LABEL[rarity]}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>

        {isCollected && unlockedAt && (
          <p className="mt-2 text-xs text-muted-foreground">
            Unlocked {new Date(unlockedAt).toLocaleDateString()}
          </p>
        )}

        {isCollected && isDynamicallyActive === false && (
          <p className="mt-2 text-xs text-muted-foreground">
            Not currently active — hidden from your profile until you requalify.
          </p>
        )}

        {!isCollected && progress && progress.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {progress.map((condition) =>
              isRankMetric(condition.metric) ? (
                <p key={condition.metric} className="text-[11px] text-muted-foreground">
                  {METRIC_LABEL[condition.metric] ?? condition.metric}: currently #
                  {condition.currentValue.toLocaleString()} · need top{" "}
                  {condition.value.toLocaleString()}
                </p>
              ) : (
                <div key={condition.metric}>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{METRIC_LABEL[condition.metric] ?? condition.metric}</span>
                    <span>
                      {Math.min(condition.currentValue, condition.value).toLocaleString()} /{" "}
                      {condition.value.toLocaleString()}
                    </span>
                  </div>
                  <ProgressBar
                    label={`${METRIC_LABEL[condition.metric] ?? condition.metric} progress`}
                    value={condition.currentValue}
                    max={condition.value}
                    className="mt-1"
                  />
                </div>
              ),
            )}
          </div>
        )}

        {!isCollected && !progress && (
          <p className="mt-2 text-xs text-muted-foreground">Awarded by the Outfiqe team.</p>
        )}

        {isCollected && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="h-7 px-2.5 text-xs"
              disabled={updateDisplay.isPending}
              onClick={() =>
                updateDisplay.mutate(
                  { badgeId: id, isDisplayed: !isDisplayed },
                  { onError: (error) => toast.error(getErrorMessage(error)) },
                )
              }
            >
              {isDisplayed ? "Hide from profile" : "Show on profile"}
            </Button>
            <Button
              variant="outline"
              className="h-7 px-2.5 text-xs"
              disabled={!isFeaturable && !isFeatured}
              onClick={() => onToggleFeatured(id)}
            >
              {isFeatured ? "Unfeature" : "Feature"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
