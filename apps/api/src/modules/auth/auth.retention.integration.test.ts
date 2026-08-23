import { randomUUID } from "node:crypto";

import { subDays } from "date-fns/subDays";
import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { generateOpaqueToken, hashToken } from "#lib/opaque-token.utils.js";

import { runAuthRetentionSweep } from "./auth.retention.js";

const uniquePhone = () => `93${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createUser = async () => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `auth-retention-${suffix}@outfiqe.test`,
      name: `Auth Retention Test ${suffix}`,
      handle: `auth-retention-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
    },
  });
};

const daysAgo = (days: number): Date => subDays(new Date(), days);

const insertRefreshToken = async (
  userId: string,
  overrides: { expiresAt: Date; revokedAt?: Date | null },
) =>
  prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(generateOpaqueToken()),
      familyId: randomUUID(),
      expiresAt: overrides.expiresAt,
      revokedAt: overrides.revokedAt ?? null,
    },
  });

describe("runAuthRetentionSweep", () => {
  it("deletes a refresh token revoked more than the retention window ago", async () => {
    const user = await createUser();
    const stale = await insertRefreshToken(user.id, {
      expiresAt: daysAgo(-7),
      revokedAt: daysAgo(31),
    });

    await runAuthRetentionSweep();

    const survivor = await prisma.refreshToken.findUnique({ where: { id: stale.id } });
    expect(survivor).toBeNull();
  });

  it("keeps a refresh token revoked within the retention window", async () => {
    const user = await createUser();
    const recent = await insertRefreshToken(user.id, {
      expiresAt: daysAgo(-7),
      revokedAt: daysAgo(1),
    });

    await runAuthRetentionSweep();

    const survivor = await prisma.refreshToken.findUnique({ where: { id: recent.id } });
    expect(survivor).not.toBeNull();
  });

  it("deletes a refresh token that expired more than the retention window ago, even if never revoked", async () => {
    const user = await createUser();
    const staleExpired = await insertRefreshToken(user.id, { expiresAt: daysAgo(31) });

    await runAuthRetentionSweep();

    const survivor = await prisma.refreshToken.findUnique({ where: { id: staleExpired.id } });
    expect(survivor).toBeNull();
  });

  it("keeps a live, unrevoked, unexpired refresh token", async () => {
    const user = await createUser();
    const live = await insertRefreshToken(user.id, { expiresAt: daysAgo(-7) });

    await runAuthRetentionSweep();

    const survivor = await prisma.refreshToken.findUnique({ where: { id: live.id } });
    expect(survivor).not.toBeNull();
  });
});
