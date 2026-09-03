import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { prisma } from "#db/prisma.js";
import {
  BankType,
  BrandPayoutStatus,
  BrandRole,
  CommissionSource,
  CommissionStatus,
  CreatorStatus,
  PaymentMethod,
  ProductStatus,
  UserRole,
  WithdrawOwnerType,
  WithdrawRequestStatus,
  WithdrawWindowType,
} from "#generated/prisma/enums.js";
import { generateTokenpair } from "#lib/generate-token-pair.utils.js";
import { redis } from "#redis/redis.client.js";
import { ensureProductType } from "#test/integration/productFixtures.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const OK_STATUS = 200;
const CREATED_STATUS = 201;
const BAD_REQUEST_STATUS = 400;

beforeEach(async () => {
  await redis.flushdb();
});

const authHeaderFor = (userId: string, role: UserRole) => {
  const { accessToken } = generateTokenpair({ sub: userId, role });
  return `Bearer ${accessToken}`;
};

const createUser = async (
  role: UserRole = UserRole.CUSTOMER,
  name = "Withdraw Tester",
  { approvedCreator = role === UserRole.CUSTOMER }: { approvedCreator?: boolean } = {},
) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `withdraw-tester-${suffix}@outfiqe.test`,
      name,
      handle: `withdraw-tester-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
      isCreator: approvedCreator,
      creatorStatus: approvedCreator ? CreatorStatus.APPROVED : CreatorStatus.NONE,
    },
  });
};

const deactivateExistingActivePolicy = (ownerType: WithdrawOwnerType) =>
  prisma.withdrawPolicy.updateMany({
    where: { ownerType, isActive: true },
    data: { isActive: false },
  });

const createOpenPolicy = async (
  ownerType: WithdrawOwnerType,
  overrides: Partial<Record<string, unknown>> = {},
) => {
  await deactivateExistingActivePolicy(ownerType);
  const admin = await createUser(UserRole.ADMIN);
  return prisma.withdrawPolicy.create({
    data: {
      ownerType,
      minAmount: 500,
      maxAmount: 100_000,
      windowType: WithdrawWindowType.CUSTOM_DAYS,
      windowValue: 1,
      maxAttemptsPerWindow: 1,
      cooldownAfterRejectionDays: 7,
      processingNoteText: "Processed manually.",
      isActive: true,
      updatedById: admin.id,
      ...overrides,
    },
  });
};

const createClosedPolicy = async (ownerType: WithdrawOwnerType) => {
  await deactivateExistingActivePolicy(ownerType);
  const admin = await createUser(UserRole.ADMIN);
  return prisma.withdrawPolicy.create({
    data: {
      ownerType,
      minAmount: 500,
      maxAmount: 100_000,
      windowType: WithdrawWindowType.CUSTOM_DAYS,
      windowValue: 30,
      maxAttemptsPerWindow: 1,
      cooldownAfterRejectionDays: 7,
      processingNoteText: "Processed manually.",
      isActive: true,
      updatedById: admin.id,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });
};

const createBank = () =>
  prisma.nepalBank.create({
    data: {
      name: `Bank ${randomUUID().slice(0, 6)}`,
      code: randomUUID().slice(0, 8).toUpperCase(),
      type: BankType.COMMERCIAL,
      isActive: true,
    },
  });

const createVerifiedBankAccount = async (userId: string) => {
  const bank = await createBank();
  return prisma.bankAccount.create({
    data: {
      userId,
      bankId: bank.id,
      accountName: "Account Holder",
      accountNumberCiphertext: "fake.fake.fake",
      accountNumberLast4: "1234",
      branchName: "Branch",
      isDefault: true,
      isVerified: true,
    },
  });
};

const createVerifiedBrandBankAccount = async (brandId: string) => {
  const bank = await createBank();
  return prisma.brandBankAccount.create({
    data: {
      brandId,
      bankId: bank.id,
      accountName: "Brand Account",
      accountNumberCiphertext: "fake.fake.fake",
      accountNumberLast4: "5678",
      branchName: "Branch",
      isDefault: true,
      isVerified: true,
    },
  });
};

const grantAvailableCommission = async (creatorId: string, amount: number) => {
  const tier = await prisma.commissionTier.create({
    data: { minPrice: 0, maxPrice: null, amount, sortOrder: 0 },
  });
  const buyer = await createUser(UserRole.CUSTOMER);
  const brand = await prisma.brand.create({
    data: {
      name: `Commission Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const product = await prisma.product.create({
    data: {
      brandId: brand.id,
      name: "Item",
      price: amount,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 5 },
  });
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Buyer",
      phone: uniquePhone(),
      address: "Somewhere",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      subtotal: amount,
      deliveryFee: 0,
      total: amount,
      items: { create: [{ productId: product.id, sizeId: size.id, qty: 1, unitPrice: amount }] },
    },
    include: { items: true },
  });
  const orderItemId = order.items[0]?.id;
  if (!orderItemId) throw new Error("order item not created");

  await prisma.creatorCommission.create({
    data: {
      creatorId,
      orderItemId,
      source: CommissionSource.TAG_CLICK,
      tierId: tier.id,
      amount,
      status: CommissionStatus.AVAILABLE,
    },
  });
};

const grantAvailableBrandPayout = async (brandId: string, netAmount: number) => {
  const admin = await createUser(UserRole.ADMIN);
  const rule = await prisma.platformCommissionRule.create({
    data: { isActive: true, updatedById: admin.id },
  });
  const buyer = await createUser(UserRole.CUSTOMER);
  const product = await prisma.product.create({
    data: {
      brandId,
      name: "Item",
      price: netAmount,
      productTypeId: await ensureProductType(),
      status: ProductStatus.APPROVED,
    },
  });
  const size = await prisma.productSize.create({
    data: { productId: product.id, label: "M", stock: 5 },
  });
  const order = await prisma.order.create({
    data: {
      userId: buyer.id,
      fullName: "Buyer",
      phone: uniquePhone(),
      address: "Somewhere",
      city: "Kathmandu",
      paymentMethod: PaymentMethod.COD,
      subtotal: netAmount,
      deliveryFee: 0,
      total: netAmount,
      items: { create: [{ productId: product.id, sizeId: size.id, qty: 1, unitPrice: netAmount }] },
    },
    include: { items: true },
  });
  const orderItemId = order.items[0]?.id;
  if (!orderItemId) throw new Error("order item not created");

  await prisma.brandPayout.create({
    data: {
      orderItemId,
      brandId,
      commissionRuleId: rule.id,
      grossAmount: netAmount,
      platformFee: 0,
      gatewayFee: 0,
      netAmount,
      status: BrandPayoutStatus.AVAILABLE,
    },
  });
};

const createBrandWithMember = async () => {
  const brand = await prisma.brand.create({
    data: {
      name: `Wallet Brand ${randomUUID().slice(0, 6)}`,
      contactName: "Contact",
      email: `${randomUUID()}@brand.outfiqe.test`,
      phone: uniquePhone(),
      instagram: `@${randomUUID().slice(0, 8)}`,
    },
  });
  const member = await createUser(UserRole.BRAND_OWNER);
  await prisma.brandMembership.create({
    data: { userId: member.id, brandId: brand.id, role: BrandRole.OWNER },
  });
  return { brand, member };
};

describe("GET /api/withdraw/policy", () => {
  it("returns the active policy for the requested ownerType", async () => {
    await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const user = await createUser();

    const response = await request(testApp)
      .get("/api/withdraw/policy")
      .query({ ownerType: "CREATOR" })
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER));

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.ownerType).toBe("CREATOR");
    expect(response.body.data.minAmount).toBe(500);
  });

  it("bootstraps and persists a default policy instead of failing when none exists yet", async () => {
    const user = await createUser();

    const response = await request(testApp)
      .get("/api/withdraw/policy")
      .query({ ownerType: "CREATOR" })
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER));

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.minAmount).toBe(500);
    expect(response.body.data.maxAmount).toBe(100_000);

    const persisted = await prisma.withdrawPolicy.findFirst({
      where: { ownerType: WithdrawOwnerType.CREATOR, isActive: true },
    });
    expect(persisted).not.toBeNull();
    expect(persisted?.updatedById).toBeNull();

    const secondResponse = await request(testApp)
      .get("/api/withdraw/policy")
      .query({ ownerType: "CREATOR" })
      .set("Authorization", authHeaderFor(user.id, UserRole.CUSTOMER));
    expect(secondResponse.body.data.minAmount).toBe(response.body.data.minAmount);

    const activePolicyCount = await prisma.withdrawPolicy.count({
      where: { ownerType: WithdrawOwnerType.CREATOR, isActive: true },
    });
    expect(activePolicyCount).toBe(1);
  });
});

describe("GET /api/withdraw/eligibility", () => {
  it("reports available balance from AVAILABLE commissions minus reserved amounts", async () => {
    await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    await grantAvailableCommission(creator.id, 5000);

    const response = await request(testApp)
      .get("/api/withdraw/eligibility")
      .query({ ownerType: "CREATOR" })
      .set("Authorization", authHeaderFor(creator.id, UserRole.CUSTOMER));

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.availableBalance).toBe(5000);
    expect(response.body.data.hasVerifiedBankAccount).toBe(false);
    expect(response.body.data.windowOpen).toBe(true);
  });

  it("reports the window as closed when outside the CUSTOM_DAYS cycle", async () => {
    await createClosedPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();

    const response = await request(testApp)
      .get("/api/withdraw/eligibility")
      .query({ ownerType: "CREATOR" })
      .set("Authorization", authHeaderFor(creator.id, UserRole.CUSTOMER));

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.windowOpen).toBe(false);
  });

  it("forbids a shopper who is not an approved creator from the creator withdraw flow", async () => {
    await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const shopper = await createUser(UserRole.CUSTOMER, "Shopper", { approvedCreator: false });
    const authHeader = authHeaderFor(shopper.id, UserRole.CUSTOMER);

    const eligibility = await request(testApp)
      .get("/api/withdraw/eligibility")
      .query({ ownerType: "CREATOR" })
      .set("Authorization", authHeader);
    expect(eligibility.status).toBe(403);
    expect(eligibility.body.code).toBe("NOT_A_CREATOR");

    const list = await request(testApp)
      .get("/api/withdraw/requests")
      .query({ ownerType: "CREATOR" })
      .set("Authorization", authHeader);
    expect(list.status).toBe(403);

    const create = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeader)
      .send({ ownerType: "CREATOR", bankAccountId: randomUUID(), amount: 1000 });
    expect(create.status).toBe(403);
  });
});

describe("POST /api/withdraw/requests — creator", () => {
  it("creates a PENDING request within policy bounds and balance", async () => {
    await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    await grantAvailableCommission(creator.id, 5000);
    const bankAccount = await createVerifiedBankAccount(creator.id);

    const response = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeaderFor(creator.id, UserRole.CUSTOMER))
      .send({ ownerType: "CREATOR", bankAccountId: bankAccount.id, amount: 1000 });

    expect(response.status).toBe(CREATED_STATUS);
    expect(response.body.data.status).toBe(WithdrawRequestStatus.PENDING);
    expect(response.body.data.requiresSecondSignOff).toBe(false);
  });

  it("rejects without a verified bank account", async () => {
    await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    await grantAvailableCommission(creator.id, 5000);

    const response = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeaderFor(creator.id, UserRole.CUSTOMER))
      .send({ ownerType: "CREATOR", bankAccountId: randomUUID(), amount: 1000 });

    expect(response.status).toBe(BAD_REQUEST_STATUS);
    expect(response.body.code).toBe("BANK_ACCOUNT_NOT_VERIFIED");
  });

  it("rejects an amount below the policy minimum", async () => {
    await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    await grantAvailableCommission(creator.id, 5000);
    const bankAccount = await createVerifiedBankAccount(creator.id);

    const response = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeaderFor(creator.id, UserRole.CUSTOMER))
      .send({ ownerType: "CREATOR", bankAccountId: bankAccount.id, amount: 100 });

    expect(response.status).toBe(BAD_REQUEST_STATUS);
    expect(response.body.code).toBe("AMOUNT_TOO_LOW");
  });

  it("hard-rejects an amount above the policy maximum for a creator", async () => {
    await createOpenPolicy(WithdrawOwnerType.CREATOR, { maxAmount: 1000 });
    const creator = await createUser();
    await grantAvailableCommission(creator.id, 5000);
    const bankAccount = await createVerifiedBankAccount(creator.id);

    const response = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeaderFor(creator.id, UserRole.CUSTOMER))
      .send({ ownerType: "CREATOR", bankAccountId: bankAccount.id, amount: 2000 });

    expect(response.status).toBe(BAD_REQUEST_STATUS);
    expect(response.body.code).toBe("AMOUNT_TOO_HIGH");
  });

  it("rejects an amount above the available balance", async () => {
    await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    await grantAvailableCommission(creator.id, 500);
    const bankAccount = await createVerifiedBankAccount(creator.id);

    const response = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeaderFor(creator.id, UserRole.CUSTOMER))
      .send({ ownerType: "CREATOR", bankAccountId: bankAccount.id, amount: 1000 });

    expect(response.status).toBe(BAD_REQUEST_STATUS);
    expect(response.body.code).toBe("INSUFFICIENT_BALANCE");
  });

  it("rejects when the withdrawal window is closed", async () => {
    await createClosedPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    await grantAvailableCommission(creator.id, 5000);
    const bankAccount = await createVerifiedBankAccount(creator.id);

    const response = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeaderFor(creator.id, UserRole.CUSTOMER))
      .send({ ownerType: "CREATOR", bankAccountId: bankAccount.id, amount: 1000 });

    expect(response.status).toBe(BAD_REQUEST_STATUS);
    expect(response.body.code).toBe("WINDOW_CLOSED");
  });

  it("rejects once the per-window attempt limit is reached", async () => {
    await createOpenPolicy(WithdrawOwnerType.CREATOR, { maxAttemptsPerWindow: 1 });
    const creator = await createUser();
    await grantAvailableCommission(creator.id, 5000);
    const bankAccount = await createVerifiedBankAccount(creator.id);
    const authHeader = authHeaderFor(creator.id, UserRole.CUSTOMER);

    const first = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeader)
      .send({ ownerType: "CREATOR", bankAccountId: bankAccount.id, amount: 500 });
    expect(first.status).toBe(CREATED_STATUS);

    const second = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeader)
      .send({ ownerType: "CREATOR", bankAccountId: bankAccount.id, amount: 500 });

    expect(second.status).toBe(BAD_REQUEST_STATUS);
    expect(second.body.code).toBe("ATTEMPTS_EXHAUSTED");
  });

  it("rejects during the post-rejection cooldown", async () => {
    const policy = await createOpenPolicy(WithdrawOwnerType.CREATOR, {
      cooldownAfterRejectionDays: 7,
      maxAttemptsPerWindow: 5,
    });
    const creator = await createUser();
    await grantAvailableCommission(creator.id, 5000);
    const bankAccount = await createVerifiedBankAccount(creator.id);

    await prisma.withdrawRequest.create({
      data: {
        ownerType: WithdrawOwnerType.CREATOR,
        creatorId: creator.id,
        requestedById: creator.id,
        bankAccountId: bankAccount.id,
        policyId: policy.id,
        amount: 500,
        status: WithdrawRequestStatus.REJECTED,
        rejectionReason: "Test rejection",
        reviewedAt: new Date(),
      },
    });

    const response = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeaderFor(creator.id, UserRole.CUSTOMER))
      .send({ ownerType: "CREATOR", bankAccountId: bankAccount.id, amount: 500 });

    expect(response.status).toBe(BAD_REQUEST_STATUS);
    expect(response.body.code).toBe("COOLDOWN_ACTIVE");
  });
});

describe("POST /api/withdraw/requests — business soft ceiling", () => {
  it("routes an over-ceiling business request to UNDER_REVIEW instead of rejecting it", async () => {
    await createOpenPolicy(WithdrawOwnerType.BUSINESS, { maxAmount: 500_000 });
    const { brand, member } = await createBrandWithMember();
    await grantAvailableBrandPayout(brand.id, 600_000);
    const bankAccount = await createVerifiedBrandBankAccount(brand.id);

    const response = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeaderFor(member.id, UserRole.BRAND_OWNER))
      .send({ ownerType: "BUSINESS", bankAccountId: bankAccount.id, amount: 550_000 });

    expect(response.status).toBe(CREATED_STATUS);
    expect(response.body.data.status).toBe(WithdrawRequestStatus.UNDER_REVIEW);
    expect(response.body.data.requiresSecondSignOff).toBe(true);
  });

  it("creates a normal PENDING request for a business under the ceiling", async () => {
    await createOpenPolicy(WithdrawOwnerType.BUSINESS, { maxAmount: 500_000 });
    const { brand, member } = await createBrandWithMember();
    await grantAvailableBrandPayout(brand.id, 10_000);
    const bankAccount = await createVerifiedBrandBankAccount(brand.id);

    const response = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeaderFor(member.id, UserRole.BRAND_OWNER))
      .send({ ownerType: "BUSINESS", bankAccountId: bankAccount.id, amount: 5_000 });

    expect(response.status).toBe(CREATED_STATUS);
    expect(response.body.data.status).toBe(WithdrawRequestStatus.PENDING);
    expect(response.body.data.requiresSecondSignOff).toBe(false);
  });

  it("self-heals a missing policy instead of failing when a business withdraws first", async () => {
    const { brand, member } = await createBrandWithMember();
    await grantAvailableBrandPayout(brand.id, 10_000);
    const bankAccount = await createVerifiedBrandBankAccount(brand.id);

    const response = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeaderFor(member.id, UserRole.BRAND_OWNER))
      .send({ ownerType: "BUSINESS", bankAccountId: bankAccount.id, amount: 5_000 });

    expect(response.status).toBe(CREATED_STATUS);
    expect(response.body.data.status).toBe(WithdrawRequestStatus.PENDING);

    const persisted = await prisma.withdrawPolicy.findFirst({
      where: { ownerType: WithdrawOwnerType.BUSINESS, isActive: true },
    });
    expect(persisted).not.toBeNull();
    expect(persisted?.minAmount).toBe(3_000);
    expect(persisted?.updatedById).toBeNull();
  });
});

describe("GET /api/withdraw/requests", () => {
  it("lists only the caller's own requests", async () => {
    await createOpenPolicy(WithdrawOwnerType.CREATOR, { maxAttemptsPerWindow: 5 });
    const creator = await createUser();
    const otherCreator = await createUser();
    await grantAvailableCommission(creator.id, 5000);
    await grantAvailableCommission(otherCreator.id, 5000);
    const bankAccount = await createVerifiedBankAccount(creator.id);
    const otherBankAccount = await createVerifiedBankAccount(otherCreator.id);

    await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeaderFor(creator.id, UserRole.CUSTOMER))
      .send({ ownerType: "CREATOR", bankAccountId: bankAccount.id, amount: 500 });
    await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeaderFor(otherCreator.id, UserRole.CUSTOMER))
      .send({ ownerType: "CREATOR", bankAccountId: otherBankAccount.id, amount: 500 });

    const response = await request(testApp)
      .get("/api/withdraw/requests")
      .query({ ownerType: "CREATOR" })
      .set("Authorization", authHeaderFor(creator.id, UserRole.CUSTOMER));

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].amount).toBe(500);
  });

  it("pages through the caller's requests with a cursor", async () => {
    await createOpenPolicy(WithdrawOwnerType.CREATOR, { maxAttemptsPerWindow: 5 });
    const creator = await createUser();
    await grantAvailableCommission(creator.id, 5000);
    const bankAccount = await createVerifiedBankAccount(creator.id);
    const authHeader = authHeaderFor(creator.id, UserRole.CUSTOMER);

    await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeader)
      .send({ ownerType: "CREATOR", bankAccountId: bankAccount.id, amount: 500 });
    await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeader)
      .send({ ownerType: "CREATOR", bankAccountId: bankAccount.id, amount: 600 });

    const firstPage = await request(testApp)
      .get("/api/withdraw/requests")
      .query({ ownerType: "CREATOR", limit: 1 })
      .set("Authorization", authHeader);

    expect(firstPage.status).toBe(OK_STATUS);
    expect(firstPage.body.data.items).toHaveLength(1);
    expect(firstPage.body.data.nextCursor).not.toBeNull();

    const secondPage = await request(testApp)
      .get("/api/withdraw/requests")
      .query({ ownerType: "CREATOR", limit: 1, cursor: firstPage.body.data.nextCursor })
      .set("Authorization", authHeader);

    expect(secondPage.status).toBe(OK_STATUS);
    expect(secondPage.body.data.items).toHaveLength(1);
    expect(secondPage.body.data.items[0].id).not.toBe(firstPage.body.data.items[0].id);
  });
});
