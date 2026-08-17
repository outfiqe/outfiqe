import { prisma } from "#db/prisma.js";
import type { BrandRole } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

import type { BrandInviteRecord, RefreshTokenRecord } from "./auth.types.js";

export const authRepository = {
  async createRefreshToken(input: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<RefreshTokenRecord> {
    return prisma.refreshToken.create({ data: input });
  },

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return prisma.refreshToken.findUnique({ where: { tokenHash } });
  },

  async deleteRefreshTokenById(id: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { id } });
  },

  async deleteRefreshTokenByHash(tokenHash: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { tokenHash } });
  },

  async deleteAllRefreshTokensForUser(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { userId } });
  },

  async findBrandInviteByTokenHash(tokenHash: string): Promise<BrandInviteRecord | null> {
    return prisma.brandInvite.findUnique({
      where: { tokenHash },
      include: { brand: { select: { name: true, avatarUrl: true } } },
    });
  },

  async markBrandInviteAccepted(id: string, client: DbClient = prisma): Promise<void> {
    await client.brandInvite.update({ where: { id }, data: { acceptedAt: new Date() } });
  },

  async createBrandMembership(
    input: {
      userId: string;
      brandId: string;
      role: BrandRole;
    },
    client: DbClient = prisma,
  ): Promise<void> {
    await client.brandMembership.create({ data: input });
  },

  async findBrandMembershipByUserId(
    userId: string,
  ): Promise<{ brandId: string; brandAvatarUrl: string | null } | null> {
    const membership = await prisma.brandMembership.findFirst({
      where: { userId },
      select: { brandId: true, brand: { select: { avatarUrl: true } } },
    });

    if (!membership) return null;
    return { brandId: membership.brandId, brandAvatarUrl: membership.brand.avatarUrl };
  },
};
