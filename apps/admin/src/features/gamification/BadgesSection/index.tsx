import { Button } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";

import { gamificationApi } from "../api";
import type { BadgeAdmin } from "../schemas";
import { BadgeCard } from "./BadgeCard";
import { BADGES_QUERY_KEY } from "./badgeForm.constants";

export const BadgesSection = () => {
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
        <Button variant="outline" size="sm" asChild>
          <Link to="/gamification/badges/new" search={{ duplicateFrom: undefined }}>
            New badge
          </Link>
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {badges?.length === 0 && <p className="text-sm text-muted-foreground">No badges yet.</p>}

        {badges?.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} onDuplicate={duplicateBadge} />
        ))}
      </div>
    </div>
  );
};
