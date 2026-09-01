import type { PlatformFeatureKey } from "./platform-features.registry.js";

export type FeatureSource = "override" | "plan" | "default";

export type ResolvedFeature = {
  key: PlatformFeatureKey;
  enabled: boolean;
  source: FeatureSource;
  metadata: Record<string, unknown>;
};

export type TenantFeatureOverrideRecord = {
  key: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
  note: string | null;
  setByUserId: string | null;
  updatedAt: Date;
};

export type SetOverrideInput = {
  organizationId: string;
  key: PlatformFeatureKey;
  enabled: boolean;
  metadata?: Record<string, unknown>;
  note?: string | null;
  setByUserId?: string | null;
};
