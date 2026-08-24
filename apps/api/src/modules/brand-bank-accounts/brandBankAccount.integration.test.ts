import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { BankType, BrandRole, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/testApp.js";

const OK_STATUS = 200;
const CREATED_STATUS = 201;
const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;

beforeEach(async () => {
  await redis.flushdb();
});

const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const uniquePhone = () => `98${randomUUID().replace(/\D/g, "1").slice(0, 8)}`;

const createUser = async (overrides: Partial<{ role: UserRole }> = {}) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `brand-bank-tester-${suffix}@outfiqe.test`,
      name: "Brand Tester",
      handle: `brand-bank-tester-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: overrides.role ?? UserRole.BRAND_OWNER,
    },
  });
};

const createBrand = () =>
  prisma.brand.create({
    data: {
      name: `Test Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Kastha Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });

const createMember = async (brandId: string, role: BrandRole = BrandRole.OWNER) => {
  const user = await createUser();
  await prisma.brandMembership.create({ data: { userId: user.id, brandId, role } });
  return user;
};

const createBank = () =>
  prisma.nepalBank.create({
    data: {
      name: `Test Bank ${randomUUID().slice(0, 6)}`,
      code: randomUUID().slice(0, 8).toUpperCase(),
      type: BankType.COMMERCIAL,
      isActive: true,
    },
  });

const validBody = (bankId: string, overrides: Partial<Record<string, string>> = {}) => ({
  bankId,
  accountName: "Kastha Contact",
  accountNumber: "1234567890",
  confirmAccountNumber: "1234567890",
  branchName: "Kamaladi",
  ...overrides,
});

describe("POST /api/brand-bank-accounts", () => {
  it("creates a brand bank account, masks the number, and defaults the first account", async () => {
    const brand = await createBrand();
    const member = await createMember(brand.id, BrandRole.STAFF);
    const bank = await createBank();

    const response = await request(testApp)
      .post("/api/brand-bank-accounts")
      .set("Authorization", authHeaderFor(member.id, UserRole.BRAND_OWNER))
      .send(validBody(bank.id));

    expect(response.status).toBe(CREATED_STATUS);
    expect(response.body.data.bankAccount.accountNumberLast4).toBe("7890");
    expect(response.body.data.bankAccount.isDefault).toBe(true);
    expect(response.body.data.nameMismatch).toBe(false);

    const stored = await prisma.brandBankAccount.findFirstOrThrow({ where: { brandId: brand.id } });
    expect(stored.accountNumberCiphertext).not.toContain("1234567890");
  });

  it("flags a name mismatch against the brand's contact name", async () => {
    const brand = await createBrand();
    const member = await createMember(brand.id);
    const bank = await createBank();

    const response = await request(testApp)
      .post("/api/brand-bank-accounts")
      .set("Authorization", authHeaderFor(member.id, UserRole.BRAND_OWNER))
      .send(validBody(bank.id, { accountName: "Someone Else" }));

    expect(response.status).toBe(CREATED_STATUS);
    expect(response.body.data.nameMismatch).toBe(true);
  });

  it("404s a user with no brand membership", async () => {
    const outsider = await createUser();
    const bank = await createBank();

    const response = await request(testApp)
      .post("/api/brand-bank-accounts")
      .set("Authorization", authHeaderFor(outsider.id, UserRole.BRAND_OWNER))
      .send(validBody(bank.id));

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });
});

describe("GET /api/brand-bank-accounts", () => {
  it("lists accounts scoped to the caller's brand regardless of which member created them", async () => {
    const brand = await createBrand();
    const owner = await createMember(brand.id, BrandRole.OWNER);
    const staff = await createMember(brand.id, BrandRole.STAFF);
    const bank = await createBank();

    await request(testApp)
      .post("/api/brand-bank-accounts")
      .set("Authorization", authHeaderFor(owner.id, UserRole.BRAND_OWNER))
      .send(validBody(bank.id));

    const response = await request(testApp)
      .get("/api/brand-bank-accounts")
      .set("Authorization", authHeaderFor(staff.id, UserRole.BRAND_OWNER));

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data).toHaveLength(1);
  });
});

describe("admin brand bank account actions", () => {
  it("verify requires admin and marks the account verified", async () => {
    const brand = await createBrand();
    const member = await createMember(brand.id);
    const admin = await createUser({ role: UserRole.ADMIN });
    const bank = await createBank();

    const created = await request(testApp)
      .post("/api/brand-bank-accounts")
      .set("Authorization", authHeaderFor(member.id, UserRole.BRAND_OWNER))
      .send(validBody(bank.id));
    const id = created.body.data.bankAccount.id;

    const forbidden = await request(testApp)
      .patch(`/api/brand-bank-accounts/${id}/verify`)
      .set("Authorization", authHeaderFor(member.id, UserRole.BRAND_OWNER));
    expect(forbidden.status).toBe(FORBIDDEN_STATUS);

    const response = await request(testApp)
      .patch(`/api/brand-bank-accounts/${id}/verify`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));
    expect(response.status).toBe(OK_STATUS);

    const stored = await prisma.brandBankAccount.findUniqueOrThrow({ where: { id } });
    expect(stored.isVerified).toBe(true);
  });

  it("reveal decrypts the number and writes an audit log entry", async () => {
    const brand = await createBrand();
    const member = await createMember(brand.id);
    const admin = await createUser({ role: UserRole.ADMIN });
    const bank = await createBank();

    const created = await request(testApp)
      .post("/api/brand-bank-accounts")
      .set("Authorization", authHeaderFor(member.id, UserRole.BRAND_OWNER))
      .send(validBody(bank.id));
    const id = created.body.data.bankAccount.id;

    const response = await request(testApp)
      .get(`/api/brand-bank-accounts/${id}/reveal`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.accountNumber).toBe("1234567890");

    const logs = await prisma.brandBankAccountAccessLog.findMany({
      where: { brandBankAccountId: id },
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.adminId).toBe(admin.id);
  });
});
