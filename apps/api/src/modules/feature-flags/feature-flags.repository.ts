import { prisma } from "#db/prisma.js";

import type {
  AllowListedBrand,
  AllowListedUser,
  FeatureFlagSettings,
  FeatureFlagState,
} from "./feature-flags.types.js";

const FLAG_STATE_SELECT = {
  key: true,
  rollout: true,
  allowedUserIds: true,
  allowedBrandIds: true,
  updatedAt: true,
} as const;

export const featureFlagsRepository = {
  async findByKey(key: string): Promise<FeatureFlagState | null> {
    return prisma.featureFlag.findUnique({ where: { key }, select: FLAG_STATE_SELECT });
  },

  async listAll(): Promise<FeatureFlagState[]> {
    return prisma.featureFlag.findMany({ select: FLAG_STATE_SELECT });
  },

  async upsert(key: string, settings: FeatureFlagSettings, updatedById: string): Promise<void> {
    await prisma.featureFlag.upsert({
      where: { key },
      create: { key, ...settings, updatedById },
      update: { ...settings, updatedById },
    });
  },

  async listExistingUserIds(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true },
    });
    return users.map(({ id }) => id);
  },

  async listExistingBrandIds(brandIds: string[]): Promise<string[]> {
    if (brandIds.length === 0) return [];
    const brands = await prisma.brand.findMany({
      where: { id: { in: brandIds } },
      select: { id: true },
    });
    return brands.map(({ id }) => id);
  },

  async listAllowListedUsers(userIds: string[]): Promise<AllowListedUser[]> {
    if (userIds.length === 0) return [];
    return prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, handle: true },
    });
  },

  async listAllowListedBrands(brandIds: string[]): Promise<AllowListedBrand[]> {
    if (brandIds.length === 0) return [];
    return prisma.brand.findMany({
      where: { id: { in: brandIds } },
      select: { id: true, name: true },
    });
  },

  async listBrandIdsForUser(userId: string): Promise<string[]> {
    const memberships = await prisma.brandMembership.findMany({
      where: { userId },
      select: { brandId: true },
    });
    return memberships.map(({ brandId }) => brandId);
  },
};
