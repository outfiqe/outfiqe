import { Button, Checkbox, FormBanner, Modal } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";
import { validateWithSchema } from "@/lib/zodFieldErrors";

import type { UpdateChallengeFormInput } from "../api";
import { gamificationApi } from "../api";
import type { ChallengeAdmin } from "../schemas";
import { ChallengeFields } from "./ChallengeFields";
import { CHALLENGES_QUERY_KEY } from "./challengeForm.constants";
import { challengeFormSchema } from "./challengeForm.schema";
import type { ChallengeFormState } from "./challengeForm.types";
import { formForChallenge, toChallengeFormInput } from "./challengeForm.utils";

export const EditChallengeModal = ({
  challenge,
  onClose,
}: {
  challenge: ChallengeAdmin;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<ChallengeFormState>(() => formForChallenge(challenge));
  const [isActive, setIsActive] = useState(challenge.isActive);
  const [achievementIsActive, setAchievementIsActive] = useState(challenge.achievement.isActive);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const errors = hasAttemptedSubmit ? validateWithSchema(challengeFormSchema, form) : {};

  const formId = `edit-challenge-${challenge.id}-form`;

  const update = useApiMutation({
    mutationFn: (input: UpdateChallengeFormInput) =>
      gamificationApi.updateChallenge(challenge.id, input),
    invalidateKeys: [CHALLENGES_QUERY_KEY],
    successMessage: "Challenge updated.",
    onSuccess: () => onClose(),
  });

  const submitChallengeEdit = (event: FormEvent) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    if (Object.keys(validateWithSchema(challengeFormSchema, form)).length > 0) return;
    update.mutate({ ...toChallengeFormInput(form), isActive, achievementIsActive });
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit challenge"
      className="sm:max-w-3xl"
      footer={
        <div className="space-y-3">
          {update.isError && <FormBanner>{getErrorMessage(update.error)}</FormBanner>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form={formId} isLoading={update.isPending}>
              Save changes
            </Button>
          </div>
        </div>
      }
    >
      <form id={formId} noValidate onSubmit={submitChallengeEdit} className="space-y-4">
        <ChallengeFields
          idPrefix={`edit-challenge-${challenge.id}`}
          form={form}
          onChange={setForm}
          errors={errors}
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
      </form>
    </Modal>
  );
};
