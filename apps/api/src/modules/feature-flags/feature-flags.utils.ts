import { FeatureFlagRollout } from "#generated/prisma/enums.js";

import type {
  FeatureFlagSettings,
  FeatureFlagState,
  FeatureFlagViewer,
} from "./feature-flags.types.js";

export const defaultFeatureFlagState = (key: string): FeatureFlagState => ({
  key,
  rollout: FeatureFlagRollout.OFF,
  allowedUserIds: [],
  allowedBrandIds: [],
  updatedAt: null,
});

export const isFlagOnFor = (
  { rollout, allowedUserIds, allowedBrandIds }: FeatureFlagSettings,
  { userId, brandIds }: FeatureFlagViewer,
): boolean => {
  if (rollout === FeatureFlagRollout.EVERYONE) return true;
  if (rollout === FeatureFlagRollout.OFF) return false;

  const isAllowedUser = userId !== null && allowedUserIds.includes(userId);
  const isAllowedBrandMember = brandIds.some((brandId) => allowedBrandIds.includes(brandId));
  return isAllowedUser || isAllowedBrandMember;
};

export const needsBrandMembershipLookup = ({ rollout, allowedBrandIds }: FeatureFlagSettings) =>
  rollout === FeatureFlagRollout.ALLOW_LIST && allowedBrandIds.length > 0;

export const toFlagSettings = ({
  rollout,
  allowedUserIds,
  allowedBrandIds,
}: FeatureFlagSettings): FeatureFlagSettings => ({ rollout, allowedUserIds, allowedBrandIds });

export const findMissingIds = (requestedIds: string[], existingIds: string[]): string[] => {
  const existingIdSet = new Set(existingIds);
  return requestedIds.filter((requestedId) => !existingIdSet.has(requestedId));
};

export const pickInOrder = <Entry>(
  ids: readonly string[],
  entryById: ReadonlyMap<string, Entry>,
): Entry[] =>
  ids.flatMap((id) => {
    const entry = entryById.get(id);
    return entry ? [entry] : [];
  });
