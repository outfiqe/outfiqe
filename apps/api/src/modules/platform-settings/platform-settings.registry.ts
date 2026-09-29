import type { PlatformSettingDefinition } from "./platform-settings.types.js";

const OUTFIT_BUILD_GROUP = "Outfit Build";
const CHAT_GROUP = "Chat";

export const PLATFORM_SETTING_REGISTRY = {
  "outfit.maxItemsPerBoard": {
    label: "Items per board",
    description: "The most products one build can hold across all of its slots.",
    group: OUTFIT_BUILD_GROUP,
    defaultValue: 7,
    minimum: 1,
    maximum: 30,
  },
  "outfit.minItemsToLock": {
    label: "Items needed to lock",
    description: "How many products a build needs before its owner can lock it.",
    group: OUTFIT_BUILD_GROUP,
    defaultValue: 2,
    minimum: 1,
    maximum: 30,
  },
  "outfit.maxEditorsPerBoard": {
    label: "Editors per board",
    description: "The most people who can edit one build, including its owner.",
    group: OUTFIT_BUILD_GROUP,
    defaultValue: 5,
    minimum: 1,
    maximum: 5,
  },
  "outfit.maxBoardsPerChat": {
    label: "Builds per chat",
    description: "The most builds that can be started inside one chat.",
    group: OUTFIT_BUILD_GROUP,
    defaultValue: 20,
    minimum: 1,
    maximum: 100,
  },
  "outfit.maxPhotosPerMember": {
    label: "Photos per person",
    description: "The most photos one person can add to a single build.",
    group: OUTFIT_BUILD_GROUP,
    defaultValue: 5,
    minimum: 0,
    maximum: 30,
  },
  "outfit.maxPhotosPerBoard": {
    label: "Photos per board",
    description: "The most photos one build can hold in total.",
    group: OUTFIT_BUILD_GROUP,
    defaultValue: 15,
    minimum: 0,
    maximum: 100,
  },
  "outfit.maxCoverPhotos": {
    label: "Cover photos",
    description: "The most photos the owner can pick for a build's cover.",
    group: OUTFIT_BUILD_GROUP,
    defaultValue: 6,
    minimum: 0,
    maximum: 10,
  },
  "chat.maxGroupMembers": {
    label: "People per group chat",
    description: "The most people one group chat can hold, including whoever started it.",
    group: CHAT_GROUP,
    defaultValue: 50,
    minimum: 3,
    maximum: 256,
  },
} as const satisfies Record<string, PlatformSettingDefinition>;

export type PlatformSettingKey = keyof typeof PLATFORM_SETTING_REGISTRY;

export type PlatformSettingValues = ReadonlyMap<PlatformSettingKey, number>;

export const isPlatformSettingKey = (key: string): key is PlatformSettingKey =>
  Object.hasOwn(PLATFORM_SETTING_REGISTRY, key);

export const PLATFORM_SETTING_KEYS: PlatformSettingKey[] =
  Object.keys(PLATFORM_SETTING_REGISTRY).filter(isPlatformSettingKey);

export const readSettingValue = (values: PlatformSettingValues, key: PlatformSettingKey): number =>
  values.get(key) ?? PLATFORM_SETTING_REGISTRY[key].defaultValue;

export const PLATFORM_SETTING_RULES: {
  message: string;
  isSatisfiedBy: (values: PlatformSettingValues) => boolean;
}[] = [
  {
    message: "Items needed to lock can't be more than the items allowed on a board.",
    isSatisfiedBy: (values) =>
      readSettingValue(values, "outfit.minItemsToLock") <=
      readSettingValue(values, "outfit.maxItemsPerBoard"),
  },
  {
    message: "Photos per person can't be more than photos per board.",
    isSatisfiedBy: (values) =>
      readSettingValue(values, "outfit.maxPhotosPerMember") <=
      readSettingValue(values, "outfit.maxPhotosPerBoard"),
  },
  {
    message: "Cover photos can't be more than photos per board.",
    isSatisfiedBy: (values) =>
      readSettingValue(values, "outfit.maxCoverPhotos") <=
      readSettingValue(values, "outfit.maxPhotosPerBoard"),
  },
];
