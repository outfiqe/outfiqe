import { Button } from "@outfiqe/design-system";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { gamificationApi } from "../api";
import type { BadgeAdmin } from "../schemas";
import { BadgeCard } from "./BadgeCard";
import { BADGES_QUERY_KEY, EMPTY_FORM } from "./badgeForm.constants";
import type { BadgeFormState } from "./badgeForm.types";
import { formForBadge } from "./badgeForm.utils";
import { CreateBadgeModal } from "./CreateBadgeModal";
import { EditBadgeModal } from "./EditBadgeModal";

const DUPLICATE_NAME_PREFIX = "Copy of ";

export const BadgesSection = () => {
  const { data: badges, isLoading } = useQuery({
    queryKey: BADGES_QUERY_KEY,
    queryFn: gamificationApi.listBadgesAdmin,
  });

  const [editingBadge, setEditingBadge] = useState<BadgeAdmin | null>(null);
  const [createForm, setCreateForm] = useState<BadgeFormState | null>(null);

  const handleDuplicate = (badge: BadgeAdmin) => {
    const duplicatedForm = formForBadge(badge);
    setCreateForm({ ...duplicatedForm, name: `${DUPLICATE_NAME_PREFIX}${duplicatedForm.name}` });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-foreground">Badges</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The full badge catalog — rule-based and admin-award.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setCreateForm(EMPTY_FORM)}>
          New badge
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {badges?.length === 0 && <p className="text-sm text-muted-foreground">No badges yet.</p>}

        {badges?.map((badge) => (
          <BadgeCard
            key={badge.id}
            badge={badge}
            onEdit={setEditingBadge}
            onDuplicate={handleDuplicate}
          />
        ))}
      </div>

      {createForm && (
        <CreateBadgeModal initialForm={createForm} onClose={() => setCreateForm(null)} />
      )}

      {editingBadge && (
        <EditBadgeModal
          key={editingBadge.id}
          badge={editingBadge}
          onClose={() => setEditingBadge(null)}
        />
      )}
    </div>
  );
};
