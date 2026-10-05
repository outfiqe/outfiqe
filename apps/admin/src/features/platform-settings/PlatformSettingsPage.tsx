import { Button, FormBanner, Input } from "@outfiqe/design-system";
import { useApiMutation } from "@outfiqe/hooks";
import { useQuery } from "@tanstack/react-query";
import { useId, useState } from "react";

import { CardRowSkeleton } from "@/components/CardRowSkeleton";
import { getErrorMessage } from "@/lib/errorMessages";

import { PLATFORM_SETTINGS_QUERY_KEY, platformSettingsApi } from "./api";
import type { PlatformSetting } from "./schemas";

const SKELETON_ROW_COUNT = 6;
const WHOLE_NUMBER = /^-?\d+$/;

const groupSettings = (settings: PlatformSetting[]): [string, PlatformSetting[]][] => {
  const settingsByGroup = new Map<string, PlatformSetting[]>();
  for (const setting of settings) {
    settingsByGroup.set(setting.group, [...(settingsByGroup.get(setting.group) ?? []), setting]);
  }
  return [...settingsByGroup.entries()];
};

const SettingRow = ({ setting }: { setting: PlatformSetting }) => {
  const inputId = useId();
  const [enteredValue, setEnteredValue] = useState(String(setting.value));
  const [formProblem, setFormProblem] = useState<string | null>(null);
  const save = useApiMutation({
    successMessage: `${setting.label} saved.`,
    mutationFn: (value: number) => platformSettingsApi.update(setting.key, value),
    invalidateKeys: [PLATFORM_SETTINGS_QUERY_KEY],
  });
  const reset = useApiMutation({
    successMessage: `${setting.label} is back to its default.`,
    mutationFn: () => platformSettingsApi.reset(setting.key),
    invalidateKeys: [PLATFORM_SETTINGS_QUERY_KEY],
    onSuccess: () => setEnteredValue(String(setting.defaultValue)),
  });
  const mutationError = save.error ?? reset.error;

  const saveIfValid = () => {
    const trimmedValue = enteredValue.trim();
    const value = Number(trimmedValue);
    if (!WHOLE_NUMBER.test(trimmedValue) || value < setting.minimum || value > setting.maximum) {
      setFormProblem(`Enter a whole number from ${setting.minimum} to ${setting.maximum}.`);
      return;
    }
    setFormProblem(null);
    save.mutate(value);
  };

  return (
    <div className="space-y-2 border-t border-border py-3 first:border-t-0">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {setting.label}
          </label>
          <p className="text-xs text-muted-foreground">
            {setting.description} Default {setting.defaultValue}, allowed {setting.minimum}–
            {setting.maximum}.{setting.isOverridden ? " Changed from the default." : ""}
          </p>
        </div>
        <Input
          id={inputId}
          inputMode="numeric"
          className="w-28"
          value={enteredValue}
          onChange={(event) => setEnteredValue(event.target.value)}
        />
        <Button size="sm" onClick={saveIfValid} isLoading={save.isPending}>
          Save
        </Button>
        {setting.isOverridden && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => reset.mutate()}
            isLoading={reset.isPending}
          >
            Reset
          </Button>
        )}
      </div>
      {formProblem && <FormBanner>{formProblem}</FormBanner>}
      {mutationError && <FormBanner>{getErrorMessage(mutationError)}</FormBanner>}
    </div>
  );
};

export const PlatformSettingsPage = () => {
  const settings = useQuery({
    queryKey: PLATFORM_SETTINGS_QUERY_KEY,
    queryFn: platformSettingsApi.list,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Platform settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Limits that apply across the platform. Changes take effect within a minute and are
          recorded in the audit log.
        </p>
      </div>

      {settings.isLoading &&
        Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
          <CardRowSkeleton key={index} textLineCount={2} />
        ))}
      {settings.error && <FormBanner>{getErrorMessage(settings.error)}</FormBanner>}
      {settings.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">There are no settings yet.</p>
      )}
      {settings.data &&
        groupSettings(settings.data).map(([group, groupedSettings]) => (
          <section key={group} className="rounded-xl border border-border bg-card px-4 py-2">
            <h2 className="pt-2 font-display text-base font-bold text-foreground">{group}</h2>
            {groupedSettings.map((setting) => (
              <SettingRow key={setting.key} setting={setting} />
            ))}
          </section>
        ))}
    </div>
  );
};
