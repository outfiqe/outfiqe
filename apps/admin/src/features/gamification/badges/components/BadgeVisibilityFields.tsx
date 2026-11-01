import { Checkbox } from "@outfiqe/design-system";

import type { BadgeDetailsFieldsProps } from "../types/badgeForm.types";
import { BrandSponsorField } from "./BrandSponsorField";

export const BadgeVisibilityFields = ({ idPrefix, form, onChange }: BadgeDetailsFieldsProps) => (
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
);
