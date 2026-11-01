import { Input, Select } from "@outfiqe/design-system";

import { FieldErrorMessage } from "@/components/FieldErrorMessage";

import type { BadgeCategoryValue, BadgeRarityValue } from "../../api/gamificationSchemas";
import { CATEGORY_OPTIONS, RARITY_OPTIONS } from "../../constants/badgeOptions.constants";
import type { BadgeDetailsFieldsProps } from "../types/badgeForm.types";

export const BadgeClassificationFields = ({
  idPrefix,
  form,
  onChange,
  errors,
}: BadgeDetailsFieldsProps) => (
  <div className="rounded-xl border border-border p-4">
    <p className="mb-3 text-sm font-medium text-foreground">Classification</p>
    <div className="flex flex-wrap items-start gap-3">
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
        <label htmlFor={`${idPrefix}-xp-reward`} className="block text-xs text-muted-foreground">
          XP reward
        </label>
        <Input
          id={`${idPrefix}-xp-reward`}
          inputMode="numeric"
          aria-invalid={"xpReward" in errors}
          value={form.xpReward}
          onChange={(e) => onChange({ ...form, xpReward: e.target.value })}
          className="w-28"
        />
        <FieldErrorMessage message={errors.xpReward} />
      </div>
    </div>
  </div>
);
