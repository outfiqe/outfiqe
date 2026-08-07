import { prisma } from "../../shared/db/prisma.js";

import type { BrandRole } from "../../generated/prisma/enums.js";
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
    return prisma.brandInvite.findUnique({ where: { tokenHash } });
  },

  async markBrandInviteAccepted(id: string): Promise<void> {
    await prisma.brandInvite.update({ where: { id }, data: { acceptedAt: new Date() } });
  },

  async createBrandMembership(input: {
    userId: string;
    brandId: string;
    role: BrandRole;
  }): Promise<void> {
    await prisma.brandMembership.create({ data: input });
  },
};
