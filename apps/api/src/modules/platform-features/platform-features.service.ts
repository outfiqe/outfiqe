import logger from "#lib/winston.utils.js";
import { describeError } from "#redis/redis.utils.js";

import {
  isPlatformFeatureKey,
  planDefaultFor,
  PLATFORM_FEATURE_REGISTRY,
  type PlatformFeatureKey,
} from "./platform-features.registry.js";
import { platformFeaturesRepository } from "./platform-features.repository.js";
import type { ResolvedFeature } from "./platform-features.types.js";

const CACHE_TTL_MS = 5_000;

type CacheEntry = { value: ResolvedFeature; expiresAt: number };
const resolveCache = new Map<string, CacheEntry>();

const cacheKey = (organizationId: string, key: PlatformFeatureKey) => `${organizationId}:${key}`;

const registryFallback = (key: PlatformFeatureKey): ResolvedFeature => ({
  key,
  enabled: PLATFORM_FEATURE_REGISTRY.find((entry) => entry.key === key)?.registryDefault ?? false,
  source: "default",
  metadata: {},
});

const resolveUncached = async (
  organizationId: string,
  key: PlatformFeatureKey,
): Promise<ResolvedFeature> => {
  const [override, plan] = await Promise.all([
    platformFeaturesRepository.findOverride(organizationId, key),
    platformFeaturesRepository.findOrganizationPlan(organizationId),
  ]);

  if (override) {
    return { key, enabled: override.enabled, source: "override", metadata: override.metadata };
  }
  if (plan) {
    return { key, enabled: planDefaultFor(key, plan), source: "plan", metadata: {} };
  }
  return registryFallback(key);
};

export const platformFeaturesService = {
  registry() {
    return PLATFORM_FEATURE_REGISTRY;
  },

  async resolveFeature(organizationId: string, key: PlatformFeatureKey): Promise<ResolvedFeature> {
    const entryKey = cacheKey(organizationId, key);
    const cached = resolveCache.get(entryKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    try {
      const value = await resolveUncached(organizationId, key);
      resolveCache.set(entryKey, { value, expiresAt: Date.now() + CACHE_TTL_MS });
      return value;
    } catch (error) {
      logger.error(
        `Feature resolve failed for ${key} on org ${organizationId}: ${describeError(error)}`,
      );
      return registryFallback(key);
    }
  },

  async isEnabled(organizationId: string, key: PlatformFeatureKey): Promise<boolean> {
    return (await this.resolveFeature(organizationId, key)).enabled;
  },

  async resolveAll(organizationId: string): Promise<ResolvedFeature[]> {
    return Promise.all(
      PLATFORM_FEATURE_REGISTRY.map((entry) => this.resolveFeature(organizationId, entry.key)),
    );
  },

  async featureMap(organizationId: string): Promise<Record<string, boolean>> {
    const resolved = await this.resolveAll(organizationId);
    return Object.fromEntries(resolved.map((feature) => [feature.key, feature.enabled]));
  },

  invalidate(organizationId: string, key?: PlatformFeatureKey) {
    if (key) {
      resolveCache.delete(cacheKey(organizationId, key));
      return;
    }
    for (const entry of resolveCache.keys()) {
      if (entry.startsWith(`${organizationId}:`)) resolveCache.delete(entry);
    }
  },

  assertKey(key: string): asserts key is PlatformFeatureKey {
    if (!isPlatformFeatureKey(key)) {
      throw new Error(`Unknown feature key: ${key}`);
    }
  },
};
