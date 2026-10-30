import { Input } from "@outfiqe/design-system";

import { FieldErrorMessage } from "@/components/FieldErrorMessage";

import { DEFAULT_BADGE_ICON } from "../../constants/badgeOptions.constants";
import type { BadgeDetailsFieldsProps } from "../types/badgeForm.types";

export const BadgeIdentityFields = ({
  idPrefix,
  form,
  onChange,
  errors,
}: BadgeDetailsFieldsProps) => (
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
        <label htmlFor={`${idPrefix}-description`} className="block text-xs text-muted-foreground">
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
        The emoji is the badge&apos;s text fallback (defaults to {DEFAULT_BADGE_ICON}) — its shape,
        colour and any custom image live on the Design tab.
      </p>
    </div>
  </div>
);
