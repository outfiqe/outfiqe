import { Checkbox, Input } from "@outfiqe/design-system";

import type { ActivityConfigFormState } from "./activityConfigForm.types";

export const ActivityConfigFields = ({
  idPrefix,
  form,
  onChange,
}: {
  idPrefix: string;
  form: ActivityConfigFormState;
  onChange: (form: ActivityConfigFormState) => void;
}) => (
  <div className="space-y-4">
    <label className="flex items-center gap-2 text-sm text-foreground">
      <Checkbox
        checked={form.enabled}
        onChange={(e) => onChange({ ...form, enabled: e.target.checked })}
      />
      Enabled
    </label>

    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-xp-amount`} className="block text-xs text-muted-foreground">
          XP amount
        </label>
        <Input
          id={`${idPrefix}-xp-amount`}
          type="number"
          required
          min={0}
          value={form.xpAmount}
          onChange={(e) => onChange({ ...form, xpAmount: e.target.value })}
          className="w-28"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-daily-limit`} className="block text-xs text-muted-foreground">
          Daily limit
        </label>
        <Input
          id={`${idPrefix}-daily-limit`}
          type="number"
          min={1}
          placeholder="No limit"
          value={form.dailyLimit}
          onChange={(e) => onChange({ ...form, dailyLimit: e.target.value })}
          className="w-28"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-cooldown`} className="block text-xs text-muted-foreground">
          Cooldown (sec)
        </label>
        <Input
          id={`${idPrefix}-cooldown`}
          type="number"
          min={1}
          placeholder="None"
          value={form.cooldownSeconds}
          onChange={(e) => onChange({ ...form, cooldownSeconds: e.target.value })}
          className="w-28"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-max-per-entity`}
          className="block text-xs text-muted-foreground"
        >
          Max per entity
        </label>
        <Input
          id={`${idPrefix}-max-per-entity`}
          type="number"
          min={1}
          placeholder="No cap"
          value={form.maxPerEntity}
          onChange={(e) => onChange({ ...form, maxPerEntity: e.target.value })}
          className="w-28"
        />
      </div>
    </div>
  </div>
);
