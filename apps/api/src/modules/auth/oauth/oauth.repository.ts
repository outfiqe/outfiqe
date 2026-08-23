import { prisma } from "#db/prisma.js";
import type { OAuthProvider } from "#generated/prisma/enums.js";
import type { DbClient } from "#types/db.types.js";

export type OAuthIdentityRecord = {
  id: string;
  userId: string;
  provider: OAuthProvider;
  providerUserId: string;
  emailAtLinkTime: string;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
};

export const oauthRepository = {
  async findByProviderIdentity(
    provider: OAuthProvider,
    providerUserId: string,
  ): Promise<OAuthIdentityRecord | null> {
    return prisma.oAuthIdentity.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
    });
  },

  async createOAuthIdentity(
    input: {
      userId: string;
      provider: OAuthProvider;
      providerUserId: string;
      emailAtLinkTime: string;
    },
    client: DbClient = prisma,
  ): Promise<OAuthIdentityRecord> {
    return client.oAuthIdentity.create({ data: input });
  },

  async findActiveOAuthIdentitiesForUser(userId: string): Promise<OAuthIdentityRecord[]> {
    return prisma.oAuthIdentity.findMany({ where: { userId, revokedAt: null } });
  },

  async findActiveIdentityForUserAndProvider(
    userId: string,
    provider: OAuthProvider,
  ): Promise<OAuthIdentityRecord | null> {
    return prisma.oAuthIdentity.findFirst({ where: { userId, provider, revokedAt: null } });
  },

  async revokeOAuthIdentity(id: string): Promise<void> {
    await prisma.oAuthIdentity.update({ where: { id }, data: { revokedAt: new Date() } });
  },

  async reviveOAuthIdentity(
    id: string,
    emailAtLinkTime: string,
    client: DbClient = prisma,
  ): Promise<void> {
    await client.oAuthIdentity.update({
      where: { id },
      data: { revokedAt: null, emailAtLinkTime },
    });
  },
};
