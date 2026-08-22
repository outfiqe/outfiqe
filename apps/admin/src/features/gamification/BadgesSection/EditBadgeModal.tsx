import { Button, Checkbox, FormBanner, Modal } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import type { UpdateBadgeFormInput } from "../api";
import { gamificationApi } from "../api";
import type { BadgeAdmin } from "../schemas";
import { BadgeFields } from "./BadgeFields";
import { BADGES_QUERY_KEY } from "./badgeForm.constants";
import type { BadgeFormState } from "./badgeForm.types";
import { formForBadge, toFormInput } from "./badgeForm.utils";

export const EditBadgeModal = ({ badge, onClose }: { badge: BadgeAdmin; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BadgeFormState>(() => formForBadge(badge));
  const [isActive, setIsActive] = useState(badge.isActive);
  const [achievementIsActive, setAchievementIsActive] = useState(
    badge.achievement?.isActive ?? true,
  );
  const [error, setError] = useState<string | null>(null);

  const formId = `edit-badge-${badge.id}-form`;

  const update = useMutation({
    mutationFn: (input: UpdateBadgeFormInput) => gamificationApi.updateBadge(badge.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BADGES_QUERY_KEY });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate({
      ...toFormInput(form),
      isActive,
      ...(form.isAdminAward ? {} : { achievementIsActive }),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit badge"
      className="sm:max-w-3xl"
      footer={
        <div className="space-y-3">
          {error && <FormBanner>{error}</FormBanner>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form={formId} disabled={update.isPending}>
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <BadgeFields idPrefix={`edit-badge-${badge.id}`} form={form} onChange={setForm} />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
        {!form.isAdminAward && (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox
              checked={achievementIsActive}
              onChange={(e) => setAchievementIsActive(e.target.checked)}
            />
            Engine evaluates this achievement (uncheck to pause auto-unlocking without hiding the
            badge)
          </label>
        )}
      </form>
    </Modal>
  );
};
