import { addMilliseconds } from "date-fns/addMilliseconds";
import { isFuture } from "date-fns/isFuture";

import { FeatureFlagRollout } from "#generated/prisma/enums.js";
import logger from "#lib/winston.utils.js";
import { AppError } from "#middlewares/error-handler.js";
import { describeError } from "#redis/redis.utils.js";

import { FEATURE_FLAG_CACHE_TTL_MS } from "./feature-flags.constants.js";
import {
  FEATURE_FLAG_KEYS,
  FEATURE_FLAG_REGISTRY,
  type FeatureFlagKey,
} from "./feature-flags.registry.js";
import { featureFlagsRepository } from "./feature-flags.repository.js";
import type {
  FeatureFlagChange,
  FeatureFlagSettings,
  FeatureFlagState,
  FeatureFlagView,
} from "./feature-flags.types.js";
import {
  defaultFeatureFlagState,
  findMissingIds,
  isFlagOnFor,
  needsBrandMembershipLookup,
  toFlagSettings,
} from "./feature-flags.utils.js";

const UNPROCESSABLE_STATUS = 422;

const cachedStates = new Map<FeatureFlagKey, { state: FeatureFlagState; expiresAt: Date }>();

const readFlagState = async (key: FeatureFlagKey): Promise<FeatureFlagState> => {
  const cached = cachedStates.get(key);
  if (cached && isFuture(cached.expiresAt)) return cached.state;

  try {
    const state = (await featureFlagsRepository.findByKey(key)) ?? defaultFeatureFlagState(key);
    cachedStates.set(key, {
      state,
      expiresAt: addMilliseconds(new Date(), FEATURE_FLAG_CACHE_TTL_MS),
    });
    return state;
  } catch (error) {
    logger.error(`Feature flag ${key} read failed, treating it as off: ${describeError(error)}`);
    return defaultFeatureFlagState(key);
  }
};

const dedupe = (ids: string[]): string[] => [...new Set(ids)];

const assertAllowListIdsExist = async ({
  allowedUserIds,
  allowedBrandIds,
}: FeatureFlagSettings): Promise<void> => {
  const [existingUserIds, existingBrandIds] = await Promise.all([
    featureFlagsRepository.listExistingUserIds(allowedUserIds),
    featureFlagsRepository.listExistingBrandIds(allowedBrandIds),
  ]);
  const unknownUserIds = findMissingIds(allowedUserIds, existingUserIds);
  const unknownBrandIds = findMissingIds(allowedBrandIds, existingBrandIds);
  if (unknownUserIds.length > 0 || unknownBrandIds.length > 0) {
    throw new AppError(
      "UNKNOWN_ALLOW_LIST_IDS",
      "Some people or brands on the allow list don't exist.",
      UNPROCESSABLE_STATUS,
      { unknownUserIds, unknownBrandIds },
    );
  }
};

export const featureFlagsService = {
  async isEnabledForUser(key: FeatureFlagKey, userId: string | null): Promise<boolean> {
    const state = await readFlagState(key);
    const brandIds =
      userId !== null && needsBrandMembershipLookup(state)
        ? await featureFlagsRepository.listBrandIdsForUser(userId)
        : [];
    return isFlagOnFor(state, { userId, brandIds });
  },

  async listEnabledKeysForUser(userId: string | null): Promise<FeatureFlagKey[]> {
    const flags = await Promise.all(
      FEATURE_FLAG_KEYS.map(async (key) => ({ key, state: await readFlagState(key) })),
    );
    const needsBrandIds =
      userId !== null && flags.some(({ state }) => needsBrandMembershipLookup(state));
    const brandIds = needsBrandIds ? await featureFlagsRepository.listBrandIdsForUser(userId) : [];
    return flags
      .filter(({ state }) => isFlagOnFor(state, { userId, brandIds }))
      .map(({ key }) => key);
  },

  async isRolledOutToAnyone(key: FeatureFlagKey): Promise<boolean> {
    const { rollout } = await readFlagState(key);
    return rollout !== FeatureFlagRollout.OFF;
  },

  async list(): Promise<FeatureFlagView[]> {
    const storedStates = await featureFlagsRepository.listAll();
    const storedStateByKey = new Map(storedStates.map((state) => [state.key, state]));
    return FEATURE_FLAG_REGISTRY.map(({ key, label, description }) => ({
      ...(storedStateByKey.get(key) ?? defaultFeatureFlagState(key)),
      label,
      description,
    }));
  },

  async update(
    key: FeatureFlagKey,
    requestedSettings: FeatureFlagSettings,
    updatedById: string,
  ): Promise<FeatureFlagChange> {
    const nextSettings: FeatureFlagSettings = {
      rollout: requestedSettings.rollout,
      allowedUserIds: dedupe(requestedSettings.allowedUserIds),
      allowedBrandIds: dedupe(requestedSettings.allowedBrandIds),
    };
    await assertAllowListIdsExist(nextSettings);

    const previousState =
      (await featureFlagsRepository.findByKey(key)) ?? defaultFeatureFlagState(key);
    await featureFlagsRepository.upsert(key, nextSettings, updatedById);
    this.invalidate(key);

    return { key, before: toFlagSettings(previousState), after: nextSettings };
  },

  invalidate(key: FeatureFlagKey): void {
    cachedStates.delete(key);
  },
};
