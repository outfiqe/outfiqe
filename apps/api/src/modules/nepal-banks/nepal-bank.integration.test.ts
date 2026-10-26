import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { BankType, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

import { nepalBankService } from "./nepal-bank.service.js";

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
      phone: uniquePhone(),
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
    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED);
  });

  it("lists only active banks, sorted by name", async () => {
    const user = await createUser();
    await createBank({ name: "Zzz Integration Active Bank", isActive: true });
    await createBank({ name: "Aaa Integration Active Bank", isActive: true });
    await createBank({ name: "Mmm Integration Hidden Bank", isActive: false });

    const response = await request(testApp)
      .get("/api/banks")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER));

    expect(response.status).toBe(HTTP_STATUS.OK);
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

describe("nepalBankService.listKnownSwiftCodes", () => {
  it("returns the swift code of every bank that has one", async () => {
    const swiftCode = `T${randomUUID().slice(0, 7).toUpperCase()}`;
    await prisma.nepalBank.create({
      data: {
        name: "Swift Test Bank",
        code: randomUUID().slice(0, 8),
        swiftCode,
        type: BankType.COMMERCIAL,
      },
    });
    await createBank({ name: "Bank Without Swift Code" });

    const knownSwiftCodes = await nepalBankService.listKnownSwiftCodes();

    expect(knownSwiftCodes.has(swiftCode)).toBe(true);
    expect([...knownSwiftCodes].every(Boolean)).toBe(true);
  });
});
