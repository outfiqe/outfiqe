import { Button, FormBanner, Modal } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { type FormEvent, useState } from "react";

import { gamificationApi } from "../api";
import { ChallengeFields } from "./ChallengeFields";
import { CHALLENGES_QUERY_KEY } from "./challengeForm.constants";
import type { ChallengeFormState } from "./challengeForm.types";
import { toChallengeFormInput } from "./challengeForm.utils";

const CREATE_CHALLENGE_FORM_ID = "create-challenge-form";

export const CreateChallengeModal = ({
  initialForm,
  onClose,
}: {
  initialForm: ChallengeFormState;
  onClose: () => void;
}) => {
  const [form, setForm] = useState<ChallengeFormState>(initialForm);
  const [error, setError] = useState<string | null>(null);

  const create = useApiMutation({
    mutationFn: () => gamificationApi.createChallenge(toChallengeFormInput(form)),
    invalidateKeys: [CHALLENGES_QUERY_KEY],
    onSuccess: () => onClose(),
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
      title="New challenge"
      className="sm:max-w-3xl"
      footer={
        <div className="space-y-3">
          {error && <FormBanner>{error}</FormBanner>}
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
      <form id={CREATE_CHALLENGE_FORM_ID} onSubmit={handleSubmit}>
        <ChallengeFields idPrefix="create-challenge" form={form} onChange={setForm} />
      </form>
    </Modal>
  );
};
