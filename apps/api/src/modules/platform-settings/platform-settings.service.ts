import { addMilliseconds } from "date-fns/addMilliseconds";
import { isFuture } from "date-fns/isFuture";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { Prisma } from "#generated/prisma/client.js";
import { runWithDeadlockRetry } from "#lib/prisma.utils.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { describeError } from "#redis/redis.utils.js";
import type { DbClient } from "#types/db.types.js";

import { PLATFORM_SETTINGS_CACHE_TTL_MS } from "./platform-settings.constants.js";
import {
  PLATFORM_SETTING_KEYS,
  PLATFORM_SETTING_REGISTRY,
  type PlatformSettingKey,
  type PlatformSettingValues,
  readSettingValue,
} from "./platform-settings.registry.js";
import { platformSettingsRepository } from "./platform-settings.repository.js";
import type { PlatformSettingChange, PlatformSettingView } from "./platform-settings.types.js";
import {
  describeAllowedRange,
  findBrokenSettingRule,
  settingValueSchema,
  toSettingValues,
  withSettingValue,
} from "./platform-settings.utils.js";

let cachedSettings: { values: PlatformSettingValues; expiresAt: Date } | null = null;

const loadSettingValues = async (client: DbClient): Promise<PlatformSettingValues> => {
  const { values, unusableKeys } = toSettingValues(
    await platformSettingsRepository.listStored(client),
  );
  if (unusableKeys.length > 0) {
    logger.warn(`Ignoring unusable platform settings, using defaults: ${unusableKeys.join(", ")}`);
  }
  return values;
};

const assertNoBrokenRule = (values: PlatformSettingValues): void => {
  const brokenRuleMessage = findBrokenSettingRule(values);
  if (brokenRuleMessage) {
    throw new AppError("SETTING_RULE_BROKEN", brokenRuleMessage, HTTP_STATUS.UNPROCESSABLE_ENTITY);
  }
};

const applySettingChange = (
  key: PlatformSettingKey,
  nextValue: number | null,
  updatedById: string,
): Promise<PlatformSettingChange> =>
  runWithDeadlockRetry(() =>
    prisma.$transaction(
      async (tx) => {
        const currentValues = await loadSettingValues(tx);
        const nextValues = withSettingValue(currentValues, key, nextValue);
        assertNoBrokenRule(nextValues);

        if (nextValue === null) await platformSettingsRepository.remove(tx, key);
        else await platformSettingsRepository.upsert(tx, key, nextValue, updatedById);

        return {
          key,
          before: readSettingValue(currentValues, key),
          after: readSettingValue(nextValues, key),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );

export const platformSettingsService = {
  async getAll(): Promise<PlatformSettingValues> {
    if (cachedSettings && isFuture(cachedSettings.expiresAt)) return cachedSettings.values;

    try {
      const values = await loadSettingValues(prisma);
      cachedSettings = {
        values,
        expiresAt: addMilliseconds(new Date(), PLATFORM_SETTINGS_CACHE_TTL_MS),
      };
      return values;
    } catch (error) {
      logger.error(`Platform settings read failed, using defaults: ${describeError(error)}`);
      return new Map();
    }
  },

  async get(key: PlatformSettingKey): Promise<number> {
    return readSettingValue(await this.getAll(), key);
  },

  async list(): Promise<PlatformSettingView[]> {
    const storedSettings = await platformSettingsRepository.listStored(prisma);
    const { values } = toSettingValues(storedSettings);
    const updatedAtByKey = new Map(storedSettings.map(({ key, updatedAt }) => [key, updatedAt]));

    return PLATFORM_SETTING_KEYS.map((key) => ({
      key,
      ...PLATFORM_SETTING_REGISTRY[key],
      value: readSettingValue(values, key),
      isOverridden: values.has(key),
      updatedAt: updatedAtByKey.get(key) ?? null,
    }));
  },

  async update(
    key: PlatformSettingKey,
    requestedValue: number,
    updatedById: string,
  ): Promise<PlatformSettingChange> {
    const parsedValue = settingValueSchema(key).safeParse(requestedValue);
    if (!parsedValue.success) {
      throw new AppError(
        "INVALID_SETTING_VALUE",
        describeAllowedRange(key),
        HTTP_STATUS.UNPROCESSABLE_ENTITY,
      );
    }

    const change = await applySettingChange(key, parsedValue.data, updatedById);
    this.invalidate();
    return change;
  },

  async reset(key: PlatformSettingKey, updatedById: string): Promise<PlatformSettingChange> {
    const change = await applySettingChange(key, null, updatedById);
    this.invalidate();
    return change;
  },

  invalidate(): void {
    cachedSettings = null;
  },
};
