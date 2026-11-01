import { Checkbox, Input, Select } from "@outfiqe/design-system";

import { FieldErrorMessage } from "@/components/FieldErrorMessage";

import type {
  BadgeCategoryValue,
  BadgeRarityValue,
  BadgeShapeValue,
} from "../../api/gamificationSchemas";
import {
  ANIMATION_OPTION_LABEL,
  ANIMATION_OPTIONS,
  AUTO_ANIMATION_OPTION,
  CATEGORY_OPTIONS,
  RARITY_OPTIONS,
  SHAPE_OPTIONS,
} from "../../constants/badgeOptions.constants";
import type { ChallengeFieldsProps, ChallengeFormState } from "../types/challengeForm.types";

export const ChallengeBadgeFields = ({
  idPrefix,
  form,
  onChange,
  errors,
}: ChallengeFieldsProps) => (
  <div className="rounded-xl border border-border p-4">
    <p className="mb-3 text-sm font-medium text-foreground">Badge awarded on completion</p>
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-48 flex-1 space-y-1.5">
          <label htmlFor={`${idPrefix}-name`} className="block text-xs text-muted-foreground">
            Badge name
          </label>
          <Input
            id={`${idPrefix}-name`}
            aria-invalid={"name" in errors}
            value={form.name}
            onChange={(e) => onChange({ ...form, name: e.target.value })}
          />
          <FieldErrorMessage message={errors.name} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${idPrefix}-icon`} className="block text-xs text-muted-foreground">
            Icon (emoji)
          </label>
          <Input
            id={`${idPrefix}-icon`}
            aria-invalid={"icon" in errors}
            value={form.icon}
            onChange={(e) => onChange({ ...form, icon: e.target.value })}
            className="w-24"
          />
          <FieldErrorMessage message={errors.icon} />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-description`} className="block text-xs text-muted-foreground">
          Badge description
        </label>
        <Input
          id={`${idPrefix}-description`}
          aria-invalid={"description" in errors}
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
        />
        <FieldErrorMessage message={errors.description} />
      </div>

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
          <label htmlFor={`${idPrefix}-animation`} className="block text-xs text-muted-foreground">
            Animation
          </label>
          <Select
            id={`${idPrefix}-animation`}
            value={form.animation}
            onChange={(e) =>
              onChange({
                ...form,
                animation: e.target.value as ChallengeFormState["animation"],
              })
            }
            className="w-36"
          >
            <option value={AUTO_ANIMATION_OPTION}>Auto (by rarity)</option>
            {ANIMATION_OPTIONS.map((animation) => (
              <option key={animation} value={animation}>
                {ANIMATION_OPTION_LABEL[animation]}
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
    </div>
  </div>
);
