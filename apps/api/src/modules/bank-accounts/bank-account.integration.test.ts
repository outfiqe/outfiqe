import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import {
  BankAccountVerificationMethod,
  BankQrCheckReason,
  BankQrCheckStatus,
  BankType,
  UserRole,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { grantPlatformPermissions } from "#test/integration/auth-helpers.js";
import {
  uploadAccountJsonQrImage,
  uploadBankQrImage,
  uploadImageWithoutQr,
  uploadQrImageWithText,
} from "#test/integration/bank-qr-fixtures.js";
import { grantLimitedPlatformStaffMembership } from "#test/integration/crm-fixtures.js";
import { grantPlatformStaffMembership } from "#test/integration/crm-fixtures.js";
import { testApp } from "#test/integration/test-app.js";
import { uniquePhone } from "#test/integration/unique-values.js";

const VALIDATION_ERROR_STATUS = HTTP_STATUS.UNPROCESSABLE_ENTITY;

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
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role: overrides.role ?? UserRole.CUSTOMER,
    },
  });
};

const createAdmin = async () => {
  const admin = await createUser({ role: UserRole.ADMIN });
  await grantPlatformStaffMembership(admin.id);
  await grantPlatformPermissions(admin.id, "platform:withdraw:manage");
  return admin;
};

const createBank = (swiftCode: string | null = null) =>
  prisma.nepalBank.create({
    data: {
      name: `Test Bank ${randomUUID().slice(0, 6)}`,
      code: randomUUID().slice(0, 8).toUpperCase(),
      swiftCode,
      type: BankType.COMMERCIAL,
      isActive: true,
    },
  });

const uniqueSwiftCode = () => `T${randomUUID().replace(/-/g, "").slice(0, 7).toUpperCase()}`;

const NOT_A_PAYMENT_QR_TEXT = "https://bank.example.com/scan-to-pay";

const validBody = async (bankId: string, overrides: Partial<Record<string, string>> = {}) => ({
  bankId,
  accountName: "Sabin Shrestha",
  accountNumber: "1234567890",
  confirmAccountNumber: "1234567890",
  branchName: "Kamaladi",
  qrCodeImageUrl: overrides.qrCodeImageUrl ?? (await uploadQrImageWithText(NOT_A_PAYMENT_QR_TEXT)),
  ...overrides,
});

describe("POST /api/bank-accounts", () => {
  it("creates a bank account, masks the number, and defaults the first account", async () => {
    const user = await createUser();
    const bank = await createBank();

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER))
      .send(await validBody(bank.id));

    expect(response.status).toBe(HTTP_STATUS.CREATED);
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
      .send(await validBody(bank.id, { accountName: "Someone Else" }));

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(response.body.data.nameMismatch).toBe(true);
  });

  it("rejects a confirm-account-number mismatch", async () => {
    const user = await createUser();
    const bank = await createBank();

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER))
      .send(await validBody(bank.id, { confirmAccountNumber: "0000000000" }));

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
      .send(await validBody(bank.id));

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it("404s when the authenticated user no longer exists", async () => {
    const bank = await createBank();

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(randomUUID(), UserRole.CUSTOMER))
      .send(await validBody(bank.id));

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
  });
});

describe("POST /api/bank-accounts QR check", () => {
  it("verifies the account straight away when the QR shows the same name and number", async () => {
    const user = await createUser();
    const bank = await createBank();
    const qrCodeImageUrl = await uploadBankQrImage({
      accountName: "SHRESTHA SABIN",
      accountNumber: "1234567890",
    });

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER))
      .send(await validBody(bank.id, { qrCodeImageUrl }));

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(response.body.data.bankAccount.isVerified).toBe(true);

    const stored = await prisma.bankAccount.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored).toMatchObject({
      isVerified: true,
      verifiedById: null,
      verificationMethod: BankAccountVerificationMethod.QR_MATCH,
      qrCheckStatus: BankQrCheckStatus.MATCHED,
      qrCheckReason: null,
    });
    expect(stored.verifiedAt).not.toBeNull();
    expect(stored.qrCheckedAt).not.toBeNull();
  });

  it("saves the account for admin review when the QR name differs", async () => {
    const user = await createUser();
    const bank = await createBank();
    const qrCodeImageUrl = await uploadBankQrImage({ accountName: "Sabin Traders" });

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER))
      .send(await validBody(bank.id, { qrCodeImageUrl }));

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(response.body.data.bankAccount.isVerified).toBe(false);

    const stored = await prisma.bankAccount.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored).toMatchObject({
      isVerified: false,
      verificationMethod: null,
      qrCheckStatus: BankQrCheckStatus.NEEDS_REVIEW,
      qrCheckReason: BankQrCheckReason.NAME_DIFFERS,
    });
  });

  it("refuses a photo with no QR code in it and saves nothing", async () => {
    const user = await createUser();
    const bank = await createBank();
    const qrCodeImageUrl = await uploadImageWithoutQr();

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER))
      .send(await validBody(bank.id, { qrCodeImageUrl }));

    expect(response.status).toBe(VALIDATION_ERROR_STATUS);
    expect(response.body.code).toBe("BANK_QR_NOT_FOUND");
    expect(await prisma.bankAccount.count({ where: { userId: user.id } })).toBe(0);
  });

  it("refuses a QR image url that is not one of our uploads", async () => {
    const user = await createUser();
    const bank = await createBank();

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER))
      .send(await validBody(bank.id, { qrCodeImageUrl: "https://cdn.outfiqe.test/bank-qr.png" }));

    expect(response.status).toBe(VALIDATION_ERROR_STATUS);
    expect(response.body.code).toBe("BANK_QR_IMAGE_NOT_UPLOADED");
    expect(await prisma.bankAccount.count({ where: { userId: user.id } })).toBe(0);
  });
});

describe("POST /api/bank-accounts with a bank account JSON QR", () => {
  it("verifies the account when the QR shows the same name, number and bank", async () => {
    const user = await createUser();
    const swiftCode = uniqueSwiftCode();
    const bank = await createBank(swiftCode);
    const qrCodeImageUrl = await uploadAccountJsonQrImage({
      accountName: "SABIN SHRESTHA",
      accountNumber: "1234567890",
      bankCode: swiftCode,
    });

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER))
      .send(await validBody(bank.id, { qrCodeImageUrl }));

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(response.body.data.bankAccount.isVerified).toBe(true);

    const stored = await prisma.bankAccount.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored).toMatchObject({
      verificationMethod: BankAccountVerificationMethod.QR_MATCH,
      qrCheckStatus: BankQrCheckStatus.MATCHED,
    });
  });

  it("refuses the account when the QR shows a different account number", async () => {
    const user = await createUser();
    const swiftCode = uniqueSwiftCode();
    const bank = await createBank(swiftCode);
    const qrCodeImageUrl = await uploadAccountJsonQrImage({
      accountNumber: "1234567899",
      bankCode: swiftCode,
    });

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER))
      .send(await validBody(bank.id, { qrCodeImageUrl }));

    expect(response.status).toBe(VALIDATION_ERROR_STATUS);
    expect(response.body.code).toBe("BANK_QR_ACCOUNT_NUMBER_MISMATCH");
    expect(await prisma.bankAccount.count({ where: { userId: user.id } })).toBe(0);
  });

  it("refuses the account when the QR is for a different bank we know", async () => {
    const user = await createUser();
    const pickedBank = await createBank(uniqueSwiftCode());
    const otherBankSwiftCode = uniqueSwiftCode();
    await createBank(otherBankSwiftCode);
    const qrCodeImageUrl = await uploadAccountJsonQrImage({ bankCode: otherBankSwiftCode });

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER))
      .send(await validBody(pickedBank.id, { qrCodeImageUrl }));

    expect(response.status).toBe(VALIDATION_ERROR_STATUS);
    expect(response.body.code).toBe("BANK_QR_BANK_MISMATCH");
  });

  it("saves the account for review when the picked bank can't be confirmed", async () => {
    const user = await createUser();
    const bank = await createBank();
    const qrCodeImageUrl = await uploadAccountJsonQrImage({ bankCode: uniqueSwiftCode() });

    const response = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER))
      .send(await validBody(bank.id, { qrCodeImageUrl }));

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    const stored = await prisma.bankAccount.findFirstOrThrow({ where: { userId: user.id } });
    expect(stored).toMatchObject({
      isVerified: false,
      qrCheckStatus: BankQrCheckStatus.NEEDS_REVIEW,
      qrCheckReason: BankQrCheckReason.BANK_NOT_CONFIRMED,
    });
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
      .send(await validBody(bank.id));
    await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(otherUser.id, UserRole.CUSTOMER))
      .send(await validBody(bank.id));

    const response = await request(testApp)
      .get("/api/bank-accounts")
      .set("Authorization", authHeaderFor(owner.id, UserRole.CUSTOMER));

    expect(response.status).toBe(HTTP_STATUS.OK);
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
        await validBody(bank.id, {
          accountNumber: "1111111111",
          confirmAccountNumber: "1111111111",
        }),
      );
    const second = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeader)
      .send(
        await validBody(bank.id, {
          accountNumber: "2222222222",
          confirmAccountNumber: "2222222222",
        }),
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
      .send(await validBody(bank.id));

    const response = await request(testApp)
      .patch(`/api/bank-accounts/${created.body.data.bankAccount.id}/default`)
      .set("Authorization", authHeaderFor(otherUser.id, UserRole.CUSTOMER));

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
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
      .send(await validBody(bank.id));
    const id = created.body.data.bankAccount.id;

    const forbidden = await request(testApp)
      .patch(`/api/bank-accounts/${id}/verify`)
      .set("Authorization", authHeaderFor(owner.id, UserRole.CUSTOMER));
    expect(forbidden.status).toBe(HTTP_STATUS.FORBIDDEN);

    const response = await request(testApp)
      .patch(`/api/bank-accounts/${id}/verify`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));
    expect(response.status).toBe(HTTP_STATUS.OK);

    const stored = await prisma.bankAccount.findUniqueOrThrow({ where: { id } });
    expect(stored.isVerified).toBe(true);
    expect(stored.verifiedById).toBe(admin.id);
    expect(stored.verificationMethod).toBe(BankAccountVerificationMethod.MANUAL);
  });

  it("reveal decrypts the number and writes an audit log entry", async () => {
    const owner = await createUser();
    const admin = await createAdmin();
    const bank = await createBank();

    const created = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(owner.id, UserRole.CUSTOMER))
      .send(await validBody(bank.id));
    const id = created.body.data.bankAccount.id;

    const response = await request(testApp)
      .get(`/api/bank-accounts/${id}/reveal`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));

    expect(response.status).toBe(HTTP_STATUS.OK);
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

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it("404s revealing a bank account that doesn't exist", async () => {
    const admin = await createAdmin();

    const response = await request(testApp)
      .get(`/api/bank-accounts/${randomUUID()}/reveal`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND);
  });

  it("blocks a platform staffer without platform:withdraw:manage", async () => {
    const owner = await createUser();
    const staffer = await createUser({ role: UserRole.ADMIN });
    await grantLimitedPlatformStaffMembership(staffer.id);
    const bank = await createBank();

    const created = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(owner.id, UserRole.CUSTOMER))
      .send(await validBody(bank.id));
    const id = created.body.data.bankAccount.id;

    const verifyResponse = await request(testApp)
      .patch(`/api/bank-accounts/${id}/verify`)
      .set("Authorization", authHeaderFor(staffer.id, UserRole.ADMIN));
    expect(verifyResponse.status).toBe(HTTP_STATUS.FORBIDDEN);

    const revealResponse = await request(testApp)
      .get(`/api/bank-accounts/${id}/reveal`)
      .set("Authorization", authHeaderFor(staffer.id, UserRole.ADMIN));
    expect(revealResponse.status).toBe(HTTP_STATUS.FORBIDDEN);
  });
});

describe("GET /api/bank-accounts/admin", () => {
  it("lists accounts with the owner's name and the uploaded QR code, filterable by verified", async () => {
    const owner = await createUser({ name: "Priya Gurung" });
    const admin = await createAdmin();
    const bank = await createBank();

    const created = await request(testApp)
      .post("/api/bank-accounts")
      .set("Authorization", authHeaderFor(owner.id, UserRole.CUSTOMER))
      .send(await validBody(bank.id));
    const id = created.body.data.bankAccount.id;

    const pending = await request(testApp)
      .get("/api/bank-accounts/admin?verified=false")
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));
    expect(pending.status).toBe(HTTP_STATUS.OK);
    const row = pending.body.data.items.find((item: { id: string }) => item.id === id);
    expect(row).toMatchObject({
      ownerName: "Priya Gurung",
      qrCodeImageUrl: created.body.data.bankAccount.qrCodeImageUrl,
      isVerified: false,
      verificationMethod: null,
      qrCheckStatus: BankQrCheckStatus.NEEDS_REVIEW,
      qrCheckReason: BankQrCheckReason.NOT_PAYMENT_QR,
    });

    await request(testApp)
      .patch(`/api/bank-accounts/${id}/verify`)
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));

    const stillPending = await request(testApp)
      .get("/api/bank-accounts/admin?verified=false")
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));
    expect(stillPending.body.data.items.some((item: { id: string }) => item.id === id)).toBe(false);

    const verified = await request(testApp)
      .get("/api/bank-accounts/admin?verified=true")
      .set("Authorization", authHeaderFor(admin.id, UserRole.ADMIN));
    expect(verified.body.data.items.some((item: { id: string }) => item.id === id)).toBe(true);
  });

  it("blocks a platform staffer without platform:withdraw:manage", async () => {
    const staffer = await createUser({ role: UserRole.ADMIN });
    await grantLimitedPlatformStaffMembership(staffer.id);

    const response = await request(testApp)
      .get("/api/bank-accounts/admin")
      .set("Authorization", authHeaderFor(staffer.id, UserRole.ADMIN));

    expect(response.status).toBe(HTTP_STATUS.FORBIDDEN);
  });
});
