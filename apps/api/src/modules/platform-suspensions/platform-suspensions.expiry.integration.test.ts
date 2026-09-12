import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { redis } from "#redis/redis.client.js";
import { redisKeys } from "#redis/redis.keys.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

import { runSuspensionExpirySweep } from "./platform-suspensions.expiry.js";

const PAST_EXPIRY = new Date(Date.now() - 60_000);
const FUTURE_EXPIRY = new Date(Date.now() + 60 * 60 * 1000);

const createSuspendedUser = async (suspensionExpiresAt: Date | null) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `expiry-${suffix}@outfiqe.test`,
      name: "Test Person",
      handle: `expiry-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      accountStatus: "SUSPENDED",
      suspendedAt: new Date(),
      suspensionReason: "Test suspension",
      suspensionExpiresAt,
    },
  });
};

const createSuspendedBrand = async (suspensionExpiresAt: Date | null) =>
  prisma.brand.create({
    data: {
      name: `Expiry Brand ${randomUUID().slice(0, 8)}`,
      contactName: "Contact Person",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
      accountStatus: "SUSPENDED",
      suspendedAt: new Date(),
      suspensionReason: "Test suspension",
      suspensionExpiresAt,
    },
  });

describe("runSuspensionExpirySweep", () => {
  it("lifts a user's and a brand's suspension once their expiry has passed, but leaves unexpired ones alone", async () => {
    const expiredUser = await createSuspendedUser(PAST_EXPIRY);
    const notYetExpiredUser = await createSuspendedUser(FUTURE_EXPIRY);
    const indefiniteUser = await createSuspendedUser(null);
    const expiredBrand = await createSuspendedBrand(PAST_EXPIRY);
    const notYetExpiredBrand = await createSuspendedBrand(FUTURE_EXPIRY);

    await redis.set(
      redisKeys.suspendedUser(expiredUser.id),
      JSON.stringify({ reason: "Test suspension", expiresAt: PAST_EXPIRY.toISOString() }),
    );

    const result = await runSuspensionExpirySweep();
    expect(result.liftedUsers).toBe(1);
    expect(result.liftedBrands).toBe(1);

    const refreshedExpiredUser = await prisma.user.findUniqueOrThrow({
      where: { id: expiredUser.id },
    });
    expect(refreshedExpiredUser.accountStatus).toBe("ACTIVE");
    expect(refreshedExpiredUser.suspensionExpiresAt).toBeNull();
    expect(await redis.get(redisKeys.suspendedUser(expiredUser.id))).toBeNull();

    const refreshedNotYetExpiredUser = await prisma.user.findUniqueOrThrow({
      where: { id: notYetExpiredUser.id },
    });
    expect(refreshedNotYetExpiredUser.accountStatus).toBe("SUSPENDED");

    const refreshedIndefiniteUser = await prisma.user.findUniqueOrThrow({
      where: { id: indefiniteUser.id },
    });
    expect(refreshedIndefiniteUser.accountStatus).toBe("SUSPENDED");

    const refreshedExpiredBrand = await prisma.brand.findUniqueOrThrow({
      where: { id: expiredBrand.id },
    });
    expect(refreshedExpiredBrand.accountStatus).toBe("ACTIVE");

    const refreshedNotYetExpiredBrand = await prisma.brand.findUniqueOrThrow({
      where: { id: notYetExpiredBrand.id },
    });
    expect(refreshedNotYetExpiredBrand.accountStatus).toBe("SUSPENDED");
  });

  it("never touches a banned account, even with no expiry set", async () => {
    const suffix = randomUUID().slice(0, 8);
    const banned = await prisma.user.create({
      data: {
        email: `expiry-banned-${suffix}@outfiqe.test`,
        name: "Banned Person",
        handle: `expiry-banned-${suffix}`,
        phone: uniquePhone(),
        passwordHash: "not-used-in-tests",
        accountStatus: "BANNED",
        suspendedAt: new Date(),
        suspensionReason: "Severe violation",
        suspensionExpiresAt: null,
      },
    });

    await runSuspensionExpirySweep();

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: banned.id } });
    expect(refreshed.accountStatus).toBe("BANNED");
  });
});
