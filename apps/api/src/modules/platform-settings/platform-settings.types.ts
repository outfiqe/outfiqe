export type PlatformSettingDefinition = {
  label: string;
  description: string;
  group: string;
  defaultValue: number;
  minimum: number;
  maximum: number;
};

export type PlatformSettingView = PlatformSettingDefinition & {
  key: string;
  value: number;
  isOverridden: boolean;
  updatedAt: Date | null;
};

export type PlatformSettingChange = {
  key: string;
  before: number;
  after: number;
};

export type StoredPlatformSetting = {
  key: string;
  value: unknown;
  updatedAt: Date;
};
