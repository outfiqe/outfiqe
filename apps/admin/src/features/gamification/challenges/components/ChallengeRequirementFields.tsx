import { Select } from "@outfiqe/design-system";

import { ConditionsEditor } from "../../conditions/components/ConditionsEditor";
import { RULE_BASED_REQUIREMENT_TYPES } from "../../constants/badgeOptions.constants";
import type { ChallengeFieldsProps, ChallengeFormState } from "../types/challengeForm.types";

export const ChallengeRequirementFields = ({
  idPrefix,
  form,
  onChange,
  errors,
}: ChallengeFieldsProps) => (
  <div className="rounded-xl border border-border p-4">
    <p className="mb-3 text-sm font-medium text-foreground">How to complete it</p>
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-requirement-type`}
          className="block text-xs text-muted-foreground"
        >
          Requirement type
        </label>
        <Select
          id={`${idPrefix}-requirement-type`}
          value={form.requirementType}
          onChange={(e) =>
            onChange({
              ...form,
              requirementType: e.target.value as ChallengeFormState["requirementType"],
            })
          }
          className="w-44"
        >
          {RULE_BASED_REQUIREMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </div>
      <ConditionsEditor
        idPrefix={`${idPrefix}-condition`}
        conditions={form.conditions}
        onChange={(conditions) => onChange({ ...form, conditions })}
        errors={errors}
      />
    </div>
  </div>
);
