import type { FieldErrorMap } from "@/lib/zodFieldErrors";

import type { BadgeFormState } from "../types/badgeForm.types";
import { BadgeClassificationFields } from "./BadgeClassificationFields";
import { BadgeIdentityFields } from "./BadgeIdentityFields";
import { BadgeUnlockRuleFields } from "./BadgeUnlockRuleFields";
import { BadgeVisibilityFields } from "./BadgeVisibilityFields";

export const BadgeDetailsFields = ({
  idPrefix,
  form,
  onChange,
  errors = {},
}: {
  idPrefix: string;
  form: BadgeFormState;
  onChange: (form: BadgeFormState) => void;
  errors?: FieldErrorMap;
}) => {
  const sectionProps = { idPrefix, form, onChange, errors };
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <BadgeIdentityFields {...sectionProps} />
        <BadgeClassificationFields {...sectionProps} />
      </div>
      <BadgeVisibilityFields {...sectionProps} />
      <BadgeUnlockRuleFields {...sectionProps} />
    </div>
  );
};
