import { z } from "zod";

import {
  isPlatformSettingKey,
  PLATFORM_SETTING_REGISTRY,
  PLATFORM_SETTING_RULES,
  type PlatformSettingKey,
  type PlatformSettingValues,
} from "./platform-settings.registry.js";
import type { StoredPlatformSetting } from "./platform-settings.types.js";

export const settingValueSchema = (key: PlatformSettingKey) => {
  const { minimum, maximum } = PLATFORM_SETTING_REGISTRY[key];
  return z.number().int().min(minimum).max(maximum);
};

export const describeAllowedRange = (key: PlatformSettingKey): string => {
  const { label, minimum, maximum } = PLATFORM_SETTING_REGISTRY[key];
  return `${label} must be a whole number from ${minimum} to ${maximum}.`;
};

export const toSettingValues = (
  storedSettings: StoredPlatformSetting[],
): { values: PlatformSettingValues; unusableKeys: string[] } => {
  const values = new Map<PlatformSettingKey, number>();
  const unusableKeys: string[] = [];

  for (const { key, value } of storedSettings) {
    if (!isPlatformSettingKey(key)) {
      unusableKeys.push(key);
      continue;
    }
    const parsedValue = settingValueSchema(key).safeParse(value);
    if (parsedValue.success) values.set(key, parsedValue.data);
    else unusableKeys.push(key);
  }

  return { values, unusableKeys };
};

export const withSettingValue = (
  values: PlatformSettingValues,
  key: PlatformSettingKey,
  value: number | null,
): PlatformSettingValues => {
  const nextValues = new Map(values);
  if (value === null) nextValues.delete(key);
  else nextValues.set(key, value);
  return nextValues;
};

export const findBrokenSettingRule = (values: PlatformSettingValues): string | null =>
  PLATFORM_SETTING_RULES.find((rule) => !rule.isSatisfiedBy(values))?.message ?? null;
