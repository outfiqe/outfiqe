import { Checkbox, Input, Select } from "@outfiqe/design-system";

import { FieldErrorMessage } from "@/components/FieldErrorMessage";
import type { FieldErrorMap } from "@/lib/zodFieldErrors";

import {
  CATEGORY_OPTIONS,
  DEFAULT_BADGE_ICON,
  RARITY_OPTIONS,
  RULE_BASED_REQUIREMENT_TYPES,
} from "../badgeOptions.constants";
import { ConditionsEditor } from "../conditions/ConditionsEditor";
import type { BadgeCategoryValue, BadgeRarityValue } from "../schemas";
import type { BadgeFormState } from "./badgeForm.types";
import { BrandSponsorField } from "./BrandSponsorField";

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
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Identity</p>
          <div className="space-y-3">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-32 flex-1 space-y-1.5">
                <label htmlFor={`${idPrefix}-name`} className="block text-xs text-muted-foreground">
                  Name
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
                  Icon (emoji, optional)
                </label>
                <Input
                  id={`${idPrefix}-icon`}
                  aria-invalid={"icon" in errors}
                  value={form.icon}
                  onChange={(e) => onChange({ ...form, icon: e.target.value })}
                  placeholder={DEFAULT_BADGE_ICON}
                  className="w-24"
                />
                <FieldErrorMessage message={errors.icon} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor={`${idPrefix}-description`}
                className="block text-xs text-muted-foreground"
              >
                Description
              </label>
              <Input
                id={`${idPrefix}-description`}
                aria-invalid={"description" in errors}
                value={form.description}
                onChange={(e) => onChange({ ...form, description: e.target.value })}
              />
              <FieldErrorMessage message={errors.description} />
            </div>
            <p className="text-xs text-muted-foreground">
              The emoji is the badge&apos;s text fallback (defaults to {DEFAULT_BADGE_ICON}) — its
              shape, colour and any custom image live on the Design tab.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="mb-3 text-sm font-medium text-foreground">Classification</p>
          <div className="flex flex-wrap items-start gap-3">
            <div className="space-y-1.5">
              <label
                htmlFor={`${idPrefix}-category`}
                className="block text-xs text-muted-foreground"
              >
                Category
              </label>
              <Select
                id={`${idPrefix}-category`}
                value={form.category}
                onChange={(e) =>
                  onChange({ ...form, category: e.target.value as BadgeCategoryValue })
                }
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
              <label
                htmlFor={`${idPrefix}-xp-reward`}
                className="block text-xs text-muted-foreground"
              >
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
      </div>

      <div className="rounded-xl border border-border p-4">
        <p className="mb-3 text-sm font-medium text-foreground">Visibility &amp; sponsor</p>
        <div className="space-y-3">
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
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={form.isDynamic}
                onChange={(e) => onChange({ ...form, isDynamic: e.target.checked })}
              />
              Dynamic (re-checked periodically; can lose eligibility)
            </label>
          </div>

          {form.isTitleEligible && (
            <label className="flex items-center gap-2 text-sm text-foreground">
              <Checkbox
                checked={form.showProfileRing}
                onChange={(e) => onChange({ ...form, showProfileRing: e.target.checked })}
              />
              Avatar ring on the profile
              <span className="text-xs text-muted-foreground">
                — a rotating ring on the wearer&apos;s avatar while this is their title
              </span>
            </label>
          )}

          <BrandSponsorField
            idPrefix={idPrefix}
            sponsorBrandId={form.sponsorBrandId}
            sponsorBrandName={form.sponsorBrandName}
            onChange={(brand) =>
              onChange({
                ...form,
                sponsorBrandId: brand?.id ?? null,
                sponsorBrandName: brand?.name ?? "",
              })
            }
          />
        </div>
      </div>

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
                  aria-invalid={"activeUntil" in errors}
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
    </div>
  );
};
