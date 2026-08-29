import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import { BankType, UserRole } from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { crmAccessService } from "#modules/crm-access/crm-access.service.js";
import { redis } from "#redis/redis.client.js";
import { ensurePlatformOrganizationExists } from "#test/integration/crmFixtures.js";
import { testApp } from "#test/integration/testApp.js";

const OK_STATUS = 200;
const CREATED_STATUS = 201;
const NOT_FOUND_STATUS = 404;
const FORBIDDEN_STATUS = 403;
const VALIDATION_ERROR_STATUS = 422;

beforeEach(async () => {
  await redis.flushdb();
});

const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createUser = async (overrides: Partial<{ name: string; role: UserRole }> = {}) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `bank-acct-tester-${suffix}@outfiqe.test`,
      name: overrides.name ?? "Sabin Shrestha",
      handle: `bank-acct-tester-${suffix}`,
      phone: `98${suffix.replace(/\D/g, "0").padEnd(8, "0").slice(0, 8)}`,
      passwordHash: "not-used-in-tests",
      role: overrides.role ?? UserRole.CUSTOMER,
    },
  });
};

const createAdmin = async () => {
  const admin = await createUser({ role: UserRole.ADMIN });
  await ensurePlatformOrganizationExists();
  await crmAccessService.grantPlatformStaffMembership(admin.id);
  return admin;
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
  accountName: "Sabin Shrestha",
  accountNumber: "1234567890",
  confirmAccountNumber: "1234567890",
  branchName: "Kamaladi",
  ...overrides,
});

describe("POST /api/bank-accounts", () => {
  it("creates a bank account, masks the number, and defaults the first account", async () => {
    const user = await createUser();
    const bank = await createBank();

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER))
      .send(validBody(bank.id));

    expect(response.status).toBe(CREATED_STATUS);
    expect(response.body.data.bankAccount.accountNumberLast4).toBe("7890");
    expect(response.body.data.bankAccount.isDefault).toBe(true);
    expect(response.body.data.nameMismatch).toBe(false);
    expect(response.body.data.bankAccount).not.toHaveProperty("accountNumberCiphertext");

    const stored = await prisma.bankAccount.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored.accountNumberCiphertext).not.toContain("1234567890");
  });

  it("flags a name mismatch without blocking creation", async () => {
    const user = await createUser({ name: "Sabin Shrestha" });
    const bank = await createBank();

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER))
      .send(validBody(bank.id, { accountName: "Someone Else" }));

    expect(response.status).toBe(CREATED_STATUS);
    expect(response.body.data.nameMismatch).toBe(true);
  });

  it("rejects a confirm-account-number mismatch", async () => {
    const user = await createUser();
    const bank = await createBank();

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER))
      .send(validBody(bank.id, { confirmAccountNumber: "0000000000" }));

    expect(response.status).toBe(VALIDATION_ERROR_STATUS);
  });

  it("rejects an inactive bank", async () => {
    const user = await createUser();
    const bank = await prisma.nepalBank.create({
      data: {
        name: "Inactive Bank",
        code: randomUUID().slice(0, 8),
        type: BankType.COMMERCIAL,
        isActive: false,
      },
    });

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER))
      .send(validBody(bank.id));

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });

  it("404s when the authenticated user no longer exists", async () => {
    const bank = await createBank();

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(randomUUID(), UserRole.CUSTOMER))
      .send(validBody(bank.id));

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });
});

describe("GET /api/bank-accounts", () => {
  it("lists only the caller's own accounts, masked", async () => {
    const owner = await createUser();
    const otherUser = await createUser();
    const bank = await createBank();

    await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(owner.id, UserRole.CUSTOMER))
      .send(validBody(bank.id));
    await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(otherUser.id, UserRole.CUSTOMER))
      .send(validBody(bank.id));

    const response = await request(testApp)
      .get("/api/bank-accounts")
      .set("Authorization", authHeaderFor(owner.id, UserRole.CUSTOMER));

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].accountNumberLast4).toBe("7890");
  });
});

describe("PATCH /api/bank-accounts/:id/default", () => {
  it("swaps the default between two of the caller's own accounts", async () => {
    const owner = await createUser();
    const bank = await createBank();
    const authHeader = authHeaderFor(owner.id, UserRole.CUSTOMER);

    const first = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeader)
      .send(
        validBody(bank.id, { accountNumber: "1111111111", confirmAccountNumber: "1111111111" }),
      );
    const second = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeader)
      .send(
        validBody(bank.id, { accountNumber: "2222222222", confirmAccountNumber: "2222222222" }),
      );

    const secondId = second.body.data.bankAccount.id;
    await request(testApp)
      .patch(`/api/bank-accounts/${secondId}/default`)
      .set("Authorization", authHeader);

    const accounts = await prisma.bankAccount.findMany({ where: { userId: owner.id } });
    const byId = new Map(accounts.map((account) => [account.id, account.isDefault]));
    expect(byId.get(secondId)).toBe(true);
    expect(byId.get(first.body.data.bankAccount.id)).toBe(false);
  });

  it("404s when the account doesn't belong to the caller", async () => {
    const owner = await createUser();
    const otherUser = await createUser();
    const bank = await createBank();

    const created = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(owner.id, UserRole.CUSTOMER))
      .send(validBody(bank.id));

    const response = await request(testApp)
      .patch(`/api/bank-accounts/${created.body.data.bankAccount.id}/default`)
      .set("Authorization", authHeaderFor(otherUser.id, UserRole.CUSTOMER));

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });
});

describe("admin bank account actions", () => {
  it("verify requires admin and marks the account verified", async () => {
    const owner = await createUser();
    const admin = await createAdmin();
    const bank = await createBank();

    const created = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(owner.id, UserRole.CUSTOMER))
      .send(validBody(bank.id));
    const id = created.body.data.bankAccount.id;

    const forbidden = await request(testApp)
      .patch(`/api/bank-accounts/${id}/verify`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.CUSTOMER));
    expect(forbidden.status).toBe(FORBIDDEN_STATUS);

    const response = await request(testApp)
      .patch(`/api/bank-accounts/${id}/verify`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));
    expect(response.status).toBe(OK_STATUS);

    const stored = await prisma.bankAccount.findUniqueOrThrow({ where: { id } });
    expect(stored.isVerified).toBe(true);
    expect(stored.verifiedById).toBe(admin.id);
  });

  it("reveal decrypts the number and writes an audit log entry", async () => {
    const owner = await createUser();
    const admin = await createAdmin();
    const bank = await createBank();

    const created = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(owner.id, UserRole.CUSTOMER))
      .send(validBody(bank.id));
    const id = created.body.data.bankAccount.id;

    const response = await request(testApp)
      .get(`/api/bank-accounts/${id}/reveal`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.accountNumber).toBe("1234567890");

    const logs = await prisma.bankAccountAccessLog.findMany({ where: { bankAccountId: id } });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.adminId).toBe(admin.id);
  });

  it("404s verifying a bank account that doesn't exist", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .patch(`/api/bank-accounts/${randomUUID()}/verify`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });

  it("404s revealing a bank account that doesn't exist", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .get(`/api/bank-accounts/${randomUUID()}/reveal`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));

    expect(response.status).toBe(NOT_FOUND_STATUS);
  });
});
