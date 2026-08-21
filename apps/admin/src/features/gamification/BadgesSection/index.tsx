import { Button, FormBanner } from "@outfiqe/design-system";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import { gamificationApi } from "../api";
import type { BadgeAdmin } from "../schemas";
import { BadgeCard } from "./BadgeCard";
import { BadgeFields } from "./BadgeFields";
import { BADGES_QUERY_KEY, EMPTY_FORM } from "./badgeForm.constants";
import type { BadgeFormState } from "./badgeForm.types";
import { toFormInput } from "./badgeForm.utils";
import { EditBadgeModal } from "./EditBadgeModal";

export const BadgesSection = () => {
  const queryClient = useQueryClient();
  const { data: badges, isLoading } = useQuery({
    queryKey: BADGES_QUERY_KEY,
    queryFn: gamificationApi.listBadgesAdmin,
  });

  const [form, setForm] = useState<BadgeFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [editingBadge, setEditingBadge] = useState<BadgeAdmin | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const create = useMutation({
    mutationFn: () => gamificationApi.createBadge(toFormInput(form)),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setError(null);
      setShowCreateForm(false);
      queryClient.invalidateQueries({ queryKey: BADGES_QUERY_KEY });
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
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
        <Button variant="outline" size="sm" onClick={() => setShowCreateForm((open) => !open)}>
          {showCreateForm ? "Cancel" : "New badge"}
        </Button>
      </div>

      {showCreateForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4 rounded-xl border border-border bg-card p-4"
        >
          <BadgeFields idPrefix="create-badge" form={form} onChange={setForm} />
          {error && <FormBanner>{error}</FormBanner>}
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Creating…" : "Create badge"}
          </Button>
        </form>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {badges?.length === 0 && <p className="text-sm text-muted-foreground">No badges yet.</p>}

        {badges?.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} onEdit={setEditingBadge} />
        ))}
      </div>

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
