import { Button, FormBanner, Modal } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { type FormEvent, useState } from "react";

import { getErrorMessage } from "@/lib/errorMessages";
import { validateWithSchema } from "@/lib/zodFieldErrors";

import { gamificationApi } from "../../api/gamificationApi";
import { CHALLENGES_QUERY_KEY } from "../constants/challengeForm.constants";
import { challengeFormSchema } from "../schemas/challengeForm.schema";
import type { ChallengeFormState } from "../types/challengeForm.types";
import { toChallengeFormInput } from "../utils/challengeForm.utils";
import { ChallengeFields } from "./ChallengeFields";

const CREATE_CHALLENGE_FORM_ID = "create-challenge-form";

export const CreateChallengeModal = ({
  initialForm,
  onClose,
}: {
  initialForm: ChallengeFormState;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<ChallengeFormState>(initialForm);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const errors = hasAttemptedSubmit ? validateWithSchema(challengeFormSchema, form) : {};

  const create = useApiMutation({
    mutationFn: () => gamificationApi.createChallenge(toChallengeFormInput(form)),
    invalidateKeys: [CHALLENGES_QUERY_KEY],
    successMessage: "Challenge created.",
    onSuccess: () => onClose(),
  });

  const submitChallenge = (event: FormEvent) => {
    event.preventDefault();
    setHasAttemptedSubmit(true);
    if (Object.keys(validateWithSchema(challengeFormSchema, form)).length > 0) return;
    create.mutate();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="New challenge"
      className="sm:max-w-3xl"
      footer={
        <div className="space-y-3">
          {create.isError && <FormBanner>{getErrorMessage(create.error)}</FormBanner>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form={CREATE_CHALLENGE_FORM_ID} isLoading={create.isPending}>
              Create challenge
            </Button>
          </div>
        </div>
      }
    >
      <form id={CREATE_CHALLENGE_FORM_ID} noValidate onSubmit={submitChallenge}>
        <ChallengeFields
          idPrefix="create-challenge"
          form={form}
          onChange={setForm}
          errors={errors}
        />
      </form>
    </Modal>
  );
};
