import type { FeatureFlagRollout } from "#generated/prisma/enums.js";

export type FeatureFlagSettings = {
  rollout: FeatureFlagRollout;
  allowedUserIds: string[];
  allowedBrandIds: string[];
};

export type FeatureFlagState = FeatureFlagSettings & {
  key: string;
  updatedAt: Date | null;
};

export type FeatureFlagView = FeatureFlagState & { label: string; description: string };

export type FeatureFlagViewer = { userId: string | null; brandIds: readonly string[] };

export type FeatureFlagChange = {
  key: string;
  before: FeatureFlagSettings;
  after: FeatureFlagSettings;
};
