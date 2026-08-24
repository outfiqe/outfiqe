import { Button, FormBanner, Modal } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";

import { gamificationApi } from "../api";
import { BadgeFields } from "./BadgeFields";
import { BADGES_QUERY_KEY } from "./badgeForm.constants";
import type { BadgeFormState } from "./badgeForm.types";
import { toFormInput } from "./badgeForm.utils";
import { writeBadgeStudioDraft } from "./DesignStudio/badgeStudioDraft.utils";

const CREATE_BADGE_FORM_ID = "create-badge-form";

export const CreateBadgeModal = ({
  initialForm,
  onClose,
}: {
  initialForm: BadgeFormState;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [form, setForm] = useState<BadgeFormState>(initialForm);
  const [error, setError] = useState<string | null>(null);

  const openDesignStudio = () => {
    writeBadgeStudioDraft({ mode: "create", form });
    void navigate({ to: "/gamification/badges/design-studio" });
  };

  const create = useMutation({
    mutationFn: () => gamificationApi.createBadge(toFormInput(form)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BADGES_QUERY_KEY });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    create.mutate();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New badge"
      className="sm:max-w-3xl"
      footer={
        <div className="space-y-3">
          {error && <FormBanner>{error}</FormBanner>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form={CREATE_BADGE_FORM_ID} disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create badge"}
            </Button>
          </div>
        </div>
      }
    >
      <form id={CREATE_BADGE_FORM_ID} onSubmit={handleSubmit}>
        <BadgeFields
          idPrefix="create-badge"
          form={form}
          onChange={setForm}
          onOpenDesignStudio={openDesignStudio}
        />
      </form>
    </Modal>
  );
};
