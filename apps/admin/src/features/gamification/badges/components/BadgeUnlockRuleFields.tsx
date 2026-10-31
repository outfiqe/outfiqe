import { Checkbox, DateInput, Input, Select } from "@outfiqe/design-system";

import { FieldErrorMessage } from "@/components/FieldErrorMessage";

import { ConditionsEditor } from "../../conditions/components/ConditionsEditor";
import { RULE_BASED_REQUIREMENT_TYPES } from "../../constants/badgeOptions.constants";
import type { BadgeDetailsFieldsProps, BadgeFormState } from "../types/badgeForm.types";

export const BadgeUnlockRuleFields = ({
  idPrefix,
  form,
  onChange,
  errors,
}: BadgeDetailsFieldsProps) => (
  <div className="rounded-xl border border-border p-4">
    <p className="mb-3 text-sm font-medium text-foreground">Unlock rule</p>
    <label className="flex items-center gap-2 text-sm text-foreground">
      <Checkbox
        checked={form.isAdminAward}
        onChange={(e) => onChange({ ...form, isAdminAward: e.target.checked })}
      />
      Admin-award only (no automatic rule — awarded by hand)
    </label>

    {form.isAdminAward ? (
      <div className="mt-3 space-y-1.5">
        <label
          htmlFor={`${idPrefix}-assignment-limit`}
          className="block text-xs text-muted-foreground"
        >
          Assignment limit (blank = unlimited)
        </label>
        <Input
          id={`${idPrefix}-assignment-limit`}
          inputMode="numeric"
          aria-invalid={"assignmentLimit" in errors}
          placeholder="Unlimited"
          value={form.assignmentLimit}
          onChange={(e) => onChange({ ...form, assignmentLimit: e.target.value })}
          className="w-32"
        />
        <FieldErrorMessage message={errors.assignmentLimit} />
      </div>
    ) : (
      <div className="mt-3 space-y-3">
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
                requirementType: e.target.value as BadgeFormState["requirementType"],
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
        <div className="flex flex-wrap gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-active-from`}
              className="block text-xs text-muted-foreground"
            >
              Active from (optional — seasonal window)
            </label>
            <DateInput
              includesTime
              id={`${idPrefix}-active-from`}
              max={form.activeUntil}
              value={form.activeFrom}
              onChange={(e) => onChange({ ...form, activeFrom: e.target.value })}
              className="w-full sm:w-56"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor={`${idPrefix}-active-until`}
              className="block text-xs text-muted-foreground"
            >
              Active until (optional)
            </label>
            <DateInput
              includesTime
              id={`${idPrefix}-active-until`}
              aria-invalid={"activeUntil" in errors}
              min={form.activeFrom}
              value={form.activeUntil}
              onChange={(e) => onChange({ ...form, activeUntil: e.target.value })}
              className="w-full sm:w-56"
            />
            <FieldErrorMessage message={errors.activeUntil} />
          </div>
        </div>
      </div>
    )}
  </div>
);
