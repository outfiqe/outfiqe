import { AchievementBadgeIcon, Badge, ProgressBar } from "@outfiqe/design-system";

import type { PublicChallenge } from "../api/challengeSchemas";
import { METRIC_LABEL, RARITY_LABEL } from "../utils/badgeLabels";

const STATUS_LABEL: Record<PublicChallenge["status"], string> = {
  UPCOMING: "Starts soon",
  OPEN: "Open now",
  ENDED: "Ended",
};

const STATUS_TONE: Record<PublicChallenge["status"], "neutral" | "positive"> = {
  UPCOMING: "neutral",
  OPEN: "positive",
  ENDED: "neutral",
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : null;

export const ChallengeCard = ({ challenge }: { challenge: PublicChallenge }) => {
  const {
    name,
    description,
    bannerImageUrl,
    status,
    activeFrom,
    activeUntil,
    badge,
    isCompleted,
    conditions,
  } = challenge;

  const dateRange = [formatDate(activeFrom), formatDate(activeUntil)].filter(Boolean).join(" – ");

  return (
    <div className="overflow-hidden rounded-2xl border border-border">
      {bannerImageUrl && (
        <div
          className="h-28 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${bannerImageUrl})` }}
          role="img"
          aria-label={`${name} banner`}
        />
      )}

      <div className="flex gap-3 p-4">
        <AchievementBadgeIcon
          icon={badge.icon}
          designConfig={badge.designConfig}
          rarity={badge.rarity}
          isLocked={!isCompleted}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{name}</p>
            <Badge showDot={false} tone={STATUS_TONE[status]}>
              {STATUS_LABEL[status]}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {dateRange && `${dateRange} · `}
            {badge.xpReward} XP · {RARITY_LABEL[badge.rarity]}
          </p>

          {isCompleted && (
            <p className="mt-2 text-xs font-medium text-primary">You completed this challenge 🎉</p>
          )}

          {!isCompleted && conditions && conditions.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {conditions.map((condition) => (
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
              ))}
            </div>
          )}

          {!isCompleted && !conditions && (
            <p className="mt-2 text-xs text-muted-foreground">
              {status === "UPCOMING"
                ? "Progress opens once the challenge starts."
                : "This challenge has ended."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
