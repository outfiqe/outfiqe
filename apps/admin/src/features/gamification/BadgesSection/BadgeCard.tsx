import { AchievementBadgeIcon, Button } from "@outfiqe/design-system";
import { Link } from "@tanstack/react-router";

import { ADMIN_AWARD_REQUIREMENT_TYPE, type BadgeAdmin } from "../schemas";

const summariseBadge = (badge: BadgeAdmin): string => {
  const { achievement } = badge;
  const isAdminAward = achievement?.requirementType === ADMIN_AWARD_REQUIREMENT_TYPE;
  const isRuleBased = Boolean(achievement) && !isAdminAward;
  const hasSeasonalWindow = Boolean(achievement?.activeFrom || achievement?.activeUntil);

  const parts = [badge.category, badge.rarity, `${badge.xpReward} XP`];

  if (!badge.isActive) parts.push("inactive");
  if (isAdminAward) {
    parts.push(
      badge.assignmentLimit === null
        ? "admin-award"
        : `admin-award (${badge.assignmentCount}/${badge.assignmentLimit})`,
    );
  }
  if (isRuleBased && !achievement?.isActive) parts.push("achievement paused");
  if (hasSeasonalWindow) parts.push("seasonal");
  if (badge.isTitleEligible) parts.push("title-eligible");
  if (badge.isDynamic) parts.push("dynamic");
  if (badge.sponsorBrand) parts.push(`sponsored by ${badge.sponsorBrand.name}`);

  return parts.join(" · ");
};

export const BadgeCard = ({
  badge,
  onDuplicate,
}: {
  badge: BadgeAdmin;
  onDuplicate: (badge: BadgeAdmin) => void;
}) => (
  <div className="flex flex-col rounded-xl border border-border bg-card p-4">
    <div className="flex min-w-0 items-start gap-2.5">
      <AchievementBadgeIcon
        icon={badge.icon}
        designConfig={badge.designConfig}
        rarity={badge.rarity}
        isLocked={false}
        className="size-10 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium text-foreground">{badge.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">{summariseBadge(badge)}</p>
      </div>
    </div>
    <div className="mt-auto flex gap-1.5 pt-3">
      <Button variant="outline" size="sm" className="flex-1" onClick={() => onDuplicate(badge)}>
        Duplicate
      </Button>
      <Button variant="outline" size="sm" className="flex-1" asChild>
        <Link to="/gamification/badges/$badgeId/edit" params={{ badgeId: badge.id }}>
          Edit
        </Link>
      </Button>
    </div>
  </div>
);
