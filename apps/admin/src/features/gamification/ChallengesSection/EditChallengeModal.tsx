import { Button, Checkbox, FormBanner, Modal } from "@outfiqe/design-system";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";

import type { UpdateChallengeFormInput } from "../api";
import { gamificationApi } from "../api";
import type { ChallengeAdmin } from "../schemas";
import { ChallengeFields } from "./ChallengeFields";
import { CHALLENGES_QUERY_KEY } from "./challengeForm.constants";
import type { ChallengeFormState } from "./challengeForm.types";
import { formForChallenge, toChallengeFormInput } from "./challengeForm.utils";

export const EditChallengeModal = ({
  challenge,
  onClose,
}: {
  challenge: ChallengeAdmin;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ChallengeFormState>(() => formForChallenge(challenge));
  const [isActive, setIsActive] = useState(challenge.isActive);
  const [achievementIsActive, setAchievementIsActive] = useState(challenge.achievement.isActive);
  const [error, setError] = useState<string | null>(null);

  const update = useMutation({
    mutationFn: (input: UpdateChallengeFormInput) =>
      gamificationApi.updateChallenge(challenge.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHALLENGES_QUERY_KEY });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Something went wrong."),
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    update.mutate({ ...toChallengeFormInput(form), isActive, achievementIsActive });
  };

  return (
    <Modal open onClose={onClose} title="Edit challenge">
      <form onSubmit={handleSubmit} className="space-y-4">
        <ChallengeFields
          idPrefix={`edit-challenge-${challenge.id}`}
          form={form}
          onChange={setForm}
        />
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Listed on the challenges page
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <Checkbox
            checked={achievementIsActive}
            onChange={(e) => setAchievementIsActive(e.target.checked)}
          />
          Engine evaluates this challenge (uncheck to pause without unlisting it)
        </label>
        {error && <FormBanner>{error}</FormBanner>}
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Modal>
  );
};
