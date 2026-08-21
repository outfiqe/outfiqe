import { Button } from "@outfiqe/design-system";

import { ADMIN_AWARD_REQUIREMENT_TYPE, type BadgeAdmin } from "../schemas";

export const BadgeCard = ({
  badge,
  onEdit,
}: {
  badge: BadgeAdmin;
  onEdit: (badge: BadgeAdmin) => void;
}) => (
  <div className="rounded-xl border border-border bg-card p-4">
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm font-medium text-foreground">
        {badge.icon} {badge.name}
      </p>
      <Button variant="outline" size="sm" onClick={() => onEdit(badge)}>
        Edit
      </Button>
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
    </p>
  </div>
);
