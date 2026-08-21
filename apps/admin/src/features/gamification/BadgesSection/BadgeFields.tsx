import { Checkbox, Input, Select } from "@outfiqe/design-system";

import {
  CATEGORY_OPTIONS,
  RARITY_OPTIONS,
  RULE_BASED_REQUIREMENT_TYPES,
  SHAPE_OPTIONS,
} from "../badgeOptions.constants";
import { ConditionsEditor } from "../conditions/ConditionsEditor";
import type { BadgeCategoryValue, BadgeRarityValue, BadgeShapeValue } from "../schemas";
import type { BadgeFormState } from "./badgeForm.types";

export const BadgeFields = ({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: BadgeFormState;
  onChange: (form: BadgeFormState) => void;
}) => (
  <div className="space-y-4">
    <div className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1 space-y-1.5">
        <label htmlFor={`${idPrefix}-name`} className="block text-xs text-muted-foreground">
          Name
        </label>
        <Input
          id={`${idPrefix}-name`}
          required
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-icon`} className="block text-xs text-muted-foreground">
          Icon (emoji)
        </label>
        <Input
          id={`${idPrefix}-icon`}
          required
          value={form.icon}
          onChange={(e) => onChange({ ...form, icon: e.target.value })}
          className="w-20"
        />
      </div>
    </div>

    <div className="space-y-1.5">
      <label htmlFor={`${idPrefix}-description`} className="block text-xs text-muted-foreground">
        Description
      </label>
      <Input
        id={`${idPrefix}-description`}
        required
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
      />
    </div>

    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-category`} className="block text-xs text-muted-foreground">
          Category
        </label>
        <Select
          id={`${idPrefix}-category`}
          value={form.category}
          onChange={(e) => onChange({ ...form, category: e.target.value as BadgeCategoryValue })}
          className="w-36"
        >
          {CATEGORY_OPTIONS.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-rarity`} className="block text-xs text-muted-foreground">
          Rarity
        </label>
        <Select
          id={`${idPrefix}-rarity`}
          value={form.rarity}
          onChange={(e) => onChange({ ...form, rarity: e.target.value as BadgeRarityValue })}
          className="w-36"
        >
          {RARITY_OPTIONS.map((rarity) => (
            <option key={rarity} value={rarity}>
              {rarity}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-shape`} className="block text-xs text-muted-foreground">
          Shape
        </label>
        <Select
          id={`${idPrefix}-shape`}
          value={form.shape}
          onChange={(e) => onChange({ ...form, shape: e.target.value as BadgeShapeValue })}
          className="w-32"
        >
          {SHAPE_OPTIONS.map((shape) => (
            <option key={shape} value={shape}>
              {shape}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-color`} className="block text-xs text-muted-foreground">
          Color
        </label>
        <Input
          id={`${idPrefix}-color`}
          type="color"
          value={form.primaryColor}
          onChange={(e) => onChange({ ...form, primaryColor: e.target.value })}
          className="h-11 w-16 p-1"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-xp-reward`} className="block text-xs text-muted-foreground">
          XP reward
        </label>
        <Input
          id={`${idPrefix}-xp-reward`}
          type="number"
          min={0}
          value={form.xpReward}
          onChange={(e) => onChange({ ...form, xpReward: e.target.value })}
          className="w-24"
        />
      </div>
    </div>

    <div className="flex flex-wrap gap-4">
      <label className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox
          checked={form.isPermanent}
          onChange={(e) => onChange({ ...form, isPermanent: e.target.checked })}
        />
        Permanent
      </label>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox
          checked={form.isPublic}
          onChange={(e) => onChange({ ...form, isPublic: e.target.checked })}
        />
        Visible while locked
      </label>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <Checkbox
          checked={form.isTitleEligible}
          onChange={(e) => onChange({ ...form, isTitleEligible: e.target.checked })}
        />
        Title-eligible
      </label>
    </div>

    <div className="rounded-xl border border-border p-4">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
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
            type="number"
            min={1}
            placeholder="Unlimited"
            value={form.assignmentLimit}
            onChange={(e) => onChange({ ...form, assignmentLimit: e.target.value })}
            className="w-32"
          />
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
          />
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor={`${idPrefix}-active-from`}
                className="block text-xs text-muted-foreground"
              >
                Active from (optional — seasonal window)
              </label>
              <Input
                id={`${idPrefix}-active-from`}
                type="datetime-local"
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
              <Input
                id={`${idPrefix}-active-until`}
                type="datetime-local"
                value={form.activeUntil}
                onChange={(e) => onChange({ ...form, activeUntil: e.target.value })}
                className="w-full sm:w-56"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  </div>
);
