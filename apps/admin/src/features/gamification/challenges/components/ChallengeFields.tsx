import type { FieldErrorMap } from "@/lib/zodFieldErrors";

import type { ChallengeFormState } from "../types/challengeForm.types";
import { ChallengeBadgeFields } from "./ChallengeBadgeFields";
import { ChallengePageFields } from "./ChallengePageFields";
import { ChallengeRequirementFields } from "./ChallengeRequirementFields";

export const ChallengeFields = ({
  idPrefix,
  form,
  onChange,
  errors = {},
}: {
  idPrefix: string;
  form: ChallengeFormState;
  onChange: (form: ChallengeFormState) => void;
  errors?: FieldErrorMap;
}) => {
  const sectionProps = { idPrefix, form, onChange, errors };
  return (
    <div className="space-y-4">
      <ChallengePageFields {...sectionProps} />
      <ChallengeBadgeFields {...sectionProps} />
      <ChallengeRequirementFields {...sectionProps} />
    </div>
  );
};
