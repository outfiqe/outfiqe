import { Button } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";

import { usePlatformPermissions } from "@/features/auth/usePlatformPermissions";
import { PLATFORM_MANAGE_PERMISSION } from "@/lib/platformManagePermissions";

import { gamificationApi } from "../api";
import type { BadgeAdmin } from "../schemas";
import { BadgeCardSkeleton } from "../skeletons";
import { BadgeCard } from "./BadgeCard";
import { BADGES_QUERY_KEY } from "./badgeForm.constants";

export const BadgesSection = () => {
  const { canUse } = usePlatformPermissions();
  const canManageGamification = canUse(PLATFORM_MANAGE_PERMISSION.GAMIFICATION);
  const navigate = useNavigate();
  const { data: badges, isLoading } = useQuery({
    queryKey: BADGES_QUERY_KEY,
    queryFn: gamificationApi.listBadgesAdmin,
  });

  const duplicateBadge = (badge: BadgeAdmin) =>
    void navigate({ to: "/gamification/badges/new", search: { duplicateFrom: badge.id } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Badges</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The full badge catalog — rule-based and admin-award.
          </p>
        </div>
        {canManageGamification && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/gamification/badges/new" search={{ duplicateFrom: undefined }}>
              New badge
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, index) => <BadgeCardSkeleton key={index} />)}
        {badges?.length === 0 && <p className="text-sm text-muted-foreground">No badges yet.</p>}

        {badges?.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            onDuplicate={duplicateBadge}
            canManage={canManageGamification}
          />
        ))}
      </div>
    </div>
  );
};
