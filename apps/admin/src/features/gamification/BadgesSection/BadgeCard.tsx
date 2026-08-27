import { AchievementBadgeIcon, Button } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";

import { ADMIN_AWARD_REQUIREMENT_TYPE, type BadgeAdmin } from "../schemas";

export const BadgeCard = ({
  badge,
  onDuplicate,
}: {
  badge: BadgeAdmin;
  onDuplicate: (badge: BadgeAdmin) => void;
}) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <AchievementBadgeIcon
          icon={badge.icon}
          designConfig={badge.designConfig}
          rarity={badge.rarity}
          isLocked={false}
          className="size-10"
        />
        <p className="truncate text-sm font-medium text-foreground">{badge.name}</p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button variant="outline" size="sm" onClick={() => onDuplicate(badge)}>
          Duplicate
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/gamification/badges/$badgeId/edit" params={{ badgeId: badge.id }}>
            Edit
          </Link>
        </Button>
      </div>
    </div>
    <p className="mt-1 text-xs text-muted-foreground">
      {badge.category} · {badge.rarity} · {badge.xpReward} XP
      {!badge.isActive && " · inactive"}
      {badge.achievement?.requirementType === ADMIN_AWARD_REQUIREMENT_TYPE &&
        ` · admin-award${badge.assignmentLimit !== null ? ` (${badge.assignmentCount}/${badge.assignmentLimit})` : ""}`}
      {badge.achievement &&
        badge.achievement.requirementType !== ADMIN_AWARD_REQUIREMENT_TYPE &&
        !badge.achievement.isActive &&
        " · achievement paused"}
      {badge.achievement?.activeFrom || badge.achievement?.activeUntil ? " · seasonal" : ""}
      {badge.isTitleEligible && " · title-eligible"}
      {badge.isDynamic && " · dynamic"}
      {badge.sponsorBrand && ` · sponsored by ${badge.sponsorBrand.name}`}
    </p>
  </div>
);
