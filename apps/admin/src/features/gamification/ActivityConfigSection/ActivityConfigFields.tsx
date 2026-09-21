import {
  Checkbox,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@outfiqe/design-system";
import type { UseFormReturn } from "react-hook-form";

import type { ActivityConfigFormState } from "./activityConfigForm.types";

type ActivityConfigNumberField = "xpAmount" | "dailyLimit" | "cooldownSeconds" | "maxPerEntity";

const NumberField = ({
  form,
  name,
  label,
  placeholder,
}: {
  form: UseFormReturn<ActivityConfigFormState>;
  name: ActivityConfigNumberField;
  label: string;
  placeholder?: string;
}) => (
  <FormField
    control={form.control}
    name={name}
    render={({ field }) => (
      <FormItem className="mt-0 w-32 space-y-1.5">
        <FormLabel className="text-xs font-normal text-muted-foreground">{label}</FormLabel>
        <FormControl>
          <Input inputMode="numeric" placeholder={placeholder} {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export const ActivityConfigFields = ({
  form,
}: {
  form: UseFormReturn<ActivityConfigFormState>;
}) => (
  <div className="space-y-4">
    <label className="flex items-center gap-2 text-sm text-foreground">
      <Checkbox {...form.register("enabled")} />
      Enabled
    </label>

    <div className="flex flex-wrap items-start gap-3">
      <NumberField form={form} name="xpAmount" label="XP amount" />
      <NumberField form={form} name="dailyLimit" label="Daily limit" placeholder="No limit" />
      <NumberField form={form} name="cooldownSeconds" label="Cooldown (sec)" placeholder="None" />
      <NumberField form={form} name="maxPerEntity" label="Max per entity" placeholder="No cap" />
    </div>
  </div>
);
