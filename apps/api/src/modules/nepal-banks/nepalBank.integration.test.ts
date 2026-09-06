import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { BankType, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/testApp.js";

const UNAUTHORIZED_STATUS = 401;
const OK_STATUS = 200;

beforeEach(async () => {
  await redis.flushdb();
});

const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createUser = async () => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `bank-tester-${suffix}@outfiqe.test`,
      name: "Bank Tester",
      handle: `bank-tester-${suffix}`,
      phone: `98${suffix.replace(/\D/g, "0").padEnd(8, "0").slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role: UserRole.CUSTOMER,
    },
  });
};

const createBank = (
  overrides: Partial<{ name: string; code: string; type: BankType; isActive: boolean }> = {},
) =>
  prisma.nepalBank.create({
    data: {
      name: overrides.name ?? `Test Bank ${randomUUID().slice(0, 6)}`,
      code: overrides.code ?? randomUUID().slice(0, 8).toUpperCase(),
      type: overrides.type ?? BankType.COMMERCIAL,
      isActive: overrides.isActive ?? true,
    },
  });

describe("GET /api/banks", () => {
  it("rejects an unauthenticated request", async () => {
    const response = await request(testApp).get("/api/banks");
    expect(response.status).toBe(UNAUTHORIZED_STATUS);
  });

  it("lists only active banks, sorted by name", async () => {
    const user = await createUser();
    await createBank({ name: "Zzz Integration Active Bank", isActive: true });
    await createBank({ name: "Aaa Integration Active Bank", isActive: true });
    await createBank({ name: "Mmm Integration Hidden Bank", isActive: false });

    const response = await request(testApp)
      .get("/api/banks")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER));

    expect(response.status).toBe(OK_STATUS);
    const names = response.body.data.map((bank: { name: string }) => bank.name);
    expect(names).not.toContain("Mmm Integration Hidden Bank");
    const firstActiveIndex = names.indexOf("Aaa Integration Active Bank");
    const secondActiveIndex = names.indexOf("Zzz Integration Active Bank");
    expect(firstActiveIndex).toBeGreaterThanOrEqual(0);
    expect(secondActiveIndex).toBeGreaterThan(firstActiveIndex);
  });

  it("never returns the isActive field on the public listing", async () => {
    const user = await createUser();
    await createBank({ name: "Public Bank" });

    const response = await request(testApp)
      .get("/api/banks")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER));

    expect(response.body.data[0]).not.toHaveProperty("isActive");
  });
});
