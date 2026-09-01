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
  PaymentMethod,
  ProductStatus,
  ProductType,
  UserRole,
  WithdrawOwnerType,
  WithdrawRequestStatus,
  WithdrawWindowType,
} from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { createAdminSession } from "#test/integration/authHelpers.js";
import { testApp } from "#test/integration/testApp.js";
import { uniquePhone } from "#test/integration/uniqueValues.js";

const OK_STATUS = 200;
const BAD_REQUEST_STATUS = 400;
const CONFLICT_STATUS = 409;

beforeEach(async () => {
  await redis.flushdb();
});

const createUser = async (role: UserRole = UserRole.CUSTOMER) => {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `withdraw-admin-tester-${suffix}@outfiqe.test`,
      name: "Withdraw Admin Tester",
      handle: `withdraw-admin-tester-${suffix}`,
      phone: uniquePhone(),
      passwordHash: "not-used-in-tests",
      role,
    },
  });
};

const createOpenPolicy = async (
  ownerType: WithdrawOwnerType,
  overrides: Partial<Record<string, unknown>> = {},
) => {
  await prisma.withdrawPolicy.updateMany({
    where: { ownerType, isActive: true },
    data: { isActive: false },
  });
  const admin = await createUser(UserRole.ADMIN);
  return prisma.withdrawPolicy.create({
    data: {
      ownerType,
      minAmount: 500,
      maxAmount: 100_000,
      windowType: WithdrawWindowType.CUSTOM_DAYS,
      windowValue: 1,
      maxAttemptsPerWindow: 5,
      cooldownAfterRejectionDays: 7,
      processingNoteText: "Processed manually.",
      isActive: true,
      updatedById: admin.id,
      ...overrides,
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
      type: ProductType.TOPS,
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

  return prisma.creatorCommission.create({
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

const createWithdrawRequest = async (
  creator: { id: string },
  bankAccountId: string,
  policyId: string,
  amount: number,
  overrides: Partial<Record<string, unknown>> = {},
) =>
  prisma.withdrawRequest.create({
    data: {
      ownerType: WithdrawOwnerType.CREATOR,
      creatorId: creator.id,
      requestedById: creator.id,
      bankAccountId,
      policyId,
      amount,
      status: WithdrawRequestStatus.PENDING,
      ...overrides,
    },
  });

describe("PATCH /api/withdraw/admin/requests/:id/approve", () => {
  it("requires an identity cross-check on a bank account's first payout", async () => {
    const { authHeader } = await createAdminSession();
    const policy = await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    const bankAccount = await createVerifiedBankAccount(creator.id);
    const withdrawRequest = await createWithdrawRequest(creator, bankAccount.id, policy.id, 1000);

    const withoutConfirmation = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${withdrawRequest.id}/approve`)
      .set("Authorization", authHeader)
      .send({});
    expect(withoutConfirmation.status).toBe(BAD_REQUEST_STATUS);
    expect(withoutConfirmation.body.code).toBe("IDENTITY_CROSS_CHECK_REQUIRED");

    const withConfirmation = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${withdrawRequest.id}/approve`)
      .set("Authorization", authHeader)
      .send({ identityCrossCheckConfirmed: true });
    expect(withConfirmation.status).toBe(OK_STATUS);

    const updatedRequest = await prisma.withdrawRequest.findUniqueOrThrow({
      where: { id: withdrawRequest.id },
    });
    expect(updatedRequest.status).toBe(WithdrawRequestStatus.APPROVED);

    const updatedAccount = await prisma.bankAccount.findUniqueOrThrow({
      where: { id: bankAccount.id },
    });
    expect(updatedAccount.firstPayoutCrossCheckedAt).not.toBeNull();
  });

  it("requires an identity cross-check on a brand bank account's first payout", async () => {
    const { authHeader } = await createAdminSession();
    const policy = await createOpenPolicy(WithdrawOwnerType.BUSINESS);
    const brand = await prisma.brand.create({
      data: {
        name: `Cross-Check Brand ${randomUUID().slice(0, 6)}`,
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
    const bank = await createBank();
    const brandBankAccount = await prisma.brandBankAccount.create({
      data: {
        brandId: brand.id,
        bankId: bank.id,
        accountName: "Brand Account",
        accountNumberCiphertext: "fake.fake.fake",
        accountNumberLast4: "5678",
        branchName: "Branch",
        isDefault: true,
        isVerified: true,
      },
    });
    const withdrawRequest = await prisma.withdrawRequest.create({
      data: {
        ownerType: WithdrawOwnerType.BUSINESS,
        brandId: brand.id,
        requestedById: member.id,
        brandBankAccountId: brandBankAccount.id,
        policyId: policy.id,
        amount: 1000,
      },
    });

    const withoutConfirmation = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${withdrawRequest.id}/approve`)
      .set("Authorization", authHeader)
      .send({});
    expect(withoutConfirmation.status).toBe(BAD_REQUEST_STATUS);
    expect(withoutConfirmation.body.code).toBe("IDENTITY_CROSS_CHECK_REQUIRED");

    const withConfirmation = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${withdrawRequest.id}/approve`)
      .set("Authorization", authHeader)
      .send({ identityCrossCheckConfirmed: true });
    expect(withConfirmation.status).toBe(OK_STATUS);

    const updatedAccount = await prisma.brandBankAccount.findUniqueOrThrow({
      where: { id: brandBankAccount.id },
    });
    expect(updatedAccount.firstPayoutCrossCheckedAt).not.toBeNull();
  });

  it("does not re-require the cross-check on a second payout to the same account", async () => {
    const { authHeader } = await createAdminSession();
    const policy = await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    const bankAccount = await createVerifiedBankAccount(creator.id);

    const first = await createWithdrawRequest(creator, bankAccount.id, policy.id, 1000);
    await request(testApp)
      .patch(`/api/withdraw/admin/requests/${first.id}/approve`)
      .set("Authorization", authHeader)
      .send({ identityCrossCheckConfirmed: true });

    const second = await createWithdrawRequest(creator, bankAccount.id, policy.id, 500);
    const response = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${second.id}/approve`)
      .set("Authorization", authHeader)
      .send({});

    expect(response.status).toBe(OK_STATUS);
  });

  it("requires a second, different admin for a soft-ceiling request", async () => {
    const admin1 = await createAdminSession();
    const admin2 = await createAdminSession();
    const policy = await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    const bankAccount = await createVerifiedBankAccount(creator.id);
    const withdrawRequest = await createWithdrawRequest(
      creator,
      bankAccount.id,
      policy.id,
      90_000,
      {
        status: WithdrawRequestStatus.UNDER_REVIEW,
        requiresSecondSignOff: true,
      },
    );

    const firstSignOff = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${withdrawRequest.id}/approve`)
      .set("Authorization", admin1.authHeader)
      .send({ identityCrossCheckConfirmed: true });
    expect(firstSignOff.status).toBe(OK_STATUS);

    const stillUnderReview = await prisma.withdrawRequest.findUniqueOrThrow({
      where: { id: withdrawRequest.id },
    });
    expect(stillUnderReview.status).toBe(WithdrawRequestStatus.UNDER_REVIEW);
    expect(stillUnderReview.firstApprovedById).toBe(admin1.userId);

    const sameAdminAgain = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${withdrawRequest.id}/approve`)
      .set("Authorization", admin1.authHeader)
      .send({});
    expect(sameAdminAgain.status).toBe(CONFLICT_STATUS);
    expect(sameAdminAgain.body.code).toBe("SAME_ADMIN_SIGN_OFF");

    const secondAdmin = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${withdrawRequest.id}/approve`)
      .set("Authorization", admin2.authHeader)
      .send({ identityCrossCheckConfirmed: true });
    expect(secondAdmin.status).toBe(OK_STATUS);

    const finalRequest = await prisma.withdrawRequest.findUniqueOrThrow({
      where: { id: withdrawRequest.id },
    });
    expect(finalRequest.status).toBe(WithdrawRequestStatus.APPROVED);
    expect(finalRequest.reviewedById).toBe(admin2.userId);
  });

  it("rejects re-approving an already-approved request", async () => {
    const { authHeader } = await createAdminSession();
    const policy = await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    const bankAccount = await createVerifiedBankAccount(creator.id);
    const withdrawRequest = await createWithdrawRequest(creator, bankAccount.id, policy.id, 1000);

    await request(testApp)
      .patch(`/api/withdraw/admin/requests/${withdrawRequest.id}/approve`)
      .set("Authorization", authHeader)
      .send({ identityCrossCheckConfirmed: true });

    const response = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${withdrawRequest.id}/approve`)
      .set("Authorization", authHeader)
      .send({});

    expect(response.status).toBe(CONFLICT_STATUS);
    expect(response.body.code).toBe("INVALID_TRANSITION");
  });
});

describe("PATCH /api/withdraw/admin/requests/:id/reject", () => {
  it("rejects a pending request with a reason", async () => {
    const { authHeader } = await createAdminSession();
    const policy = await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    const bankAccount = await createVerifiedBankAccount(creator.id);
    const withdrawRequest = await createWithdrawRequest(creator, bankAccount.id, policy.id, 1000);

    const response = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${withdrawRequest.id}/reject`)
      .set("Authorization", authHeader)
      .send({ reason: "Suspicious activity" });

    expect(response.status).toBe(OK_STATUS);
    const updated = await prisma.withdrawRequest.findUniqueOrThrow({
      where: { id: withdrawRequest.id },
    });
    expect(updated.status).toBe(WithdrawRequestStatus.REJECTED);
    expect(updated.rejectionReason).toBe("Suspicious activity");
  });
});

describe("PATCH /api/withdraw/admin/requests/:id/mark-paid", () => {
  it("claims AVAILABLE commissions oldest-first and creates ledger entries", async () => {
    const { authHeader } = await createAdminSession();
    const policy = await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    const bankAccount = await createVerifiedBankAccount(creator.id);
    const commissionA = await grantAvailableCommission(creator.id, 600);
    const commissionB = await grantAvailableCommission(creator.id, 600);

    const withdrawRequest = await createWithdrawRequest(creator, bankAccount.id, policy.id, 1000, {
      status: WithdrawRequestStatus.APPROVED,
    });

    const response = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${withdrawRequest.id}/mark-paid`)
      .set("Authorization", authHeader)
      .send({ referenceNote: "TXN123" });

    expect(response.status).toBe(OK_STATUS);

    const updatedRequest = await prisma.withdrawRequest.findUniqueOrThrow({
      where: { id: withdrawRequest.id },
    });
    expect(updatedRequest.status).toBe(WithdrawRequestStatus.PAID);
    expect(updatedRequest.referenceNote).toBe("TXN123");

    const claimedCommissionA = await prisma.creatorCommission.findUniqueOrThrow({
      where: { id: commissionA.id },
    });
    const claimedCommissionB = await prisma.creatorCommission.findUniqueOrThrow({
      where: { id: commissionB.id },
    });
    expect(claimedCommissionA.status).toBe(CommissionStatus.PAID);
    expect(claimedCommissionB.status).toBe(CommissionStatus.PAID);

    const ledgerEntries = await prisma.withdrawRequestLedgerEntry.findMany({
      where: { withdrawRequestId: withdrawRequest.id },
    });
    expect(ledgerEntries).toHaveLength(2);
  });

  it("fails cleanly when there aren't enough available rows, leaving the request APPROVED", async () => {
    const { authHeader } = await createAdminSession();
    const policy = await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    const bankAccount = await createVerifiedBankAccount(creator.id);
    await grantAvailableCommission(creator.id, 200);

    const withdrawRequest = await createWithdrawRequest(creator, bankAccount.id, policy.id, 1000, {
      status: WithdrawRequestStatus.APPROVED,
    });

    const response = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${withdrawRequest.id}/mark-paid`)
      .set("Authorization", authHeader)
      .send({ referenceNote: "TXN123" });

    expect(response.status).toBe(CONFLICT_STATUS);
    expect(response.body.code).toBe("INSUFFICIENT_LEDGER_ROWS");

    const updated = await prisma.withdrawRequest.findUniqueOrThrow({
      where: { id: withdrawRequest.id },
    });
    expect(updated.status).toBe(WithdrawRequestStatus.APPROVED);
  });

  it("rejects marking a non-approved request paid", async () => {
    const { authHeader } = await createAdminSession();
    const policy = await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    const bankAccount = await createVerifiedBankAccount(creator.id);
    const withdrawRequest = await createWithdrawRequest(creator, bankAccount.id, policy.id, 1000);

    const response = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${withdrawRequest.id}/mark-paid`)
      .set("Authorization", authHeader)
      .send({ referenceNote: "TXN123" });

    expect(response.status).toBe(CONFLICT_STATUS);
    expect(response.body.code).toBe("INVALID_TRANSITION");
  });

  it("claims AVAILABLE brand payouts for a business request", async () => {
    const { authHeader } = await createAdminSession();
    const admin = await createAdminSession();
    const policy = await createOpenPolicy(WithdrawOwnerType.BUSINESS);
    const brand = await prisma.brand.create({
      data: {
        name: `Payout Brand ${randomUUID().slice(0, 6)}`,
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
    const bank = await createBank();
    const brandBankAccount = await prisma.brandBankAccount.create({
      data: {
        brandId: brand.id,
        bankId: bank.id,
        accountName: "Brand Account",
        accountNumberCiphertext: "fake.fake.fake",
        accountNumberLast4: "5678",
        branchName: "Branch",
        isDefault: true,
        isVerified: true,
      },
    });
    const rule = await prisma.platformCommissionRule.create({
      data: { isActive: true, updatedById: admin.userId },
    });
    const buyer = await createUser(UserRole.CUSTOMER);
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        name: "Item",
        price: 1000,
        type: ProductType.TOPS,
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
        subtotal: 1000,
        deliveryFee: 0,
        total: 1000,
        items: { create: [{ productId: product.id, sizeId: size.id, qty: 1, unitPrice: 1000 }] },
      },
      include: { items: true },
    });
    const orderItemId = order.items[0]?.id;
    if (!orderItemId) throw new Error("order item not created");
    const brandPayout = await prisma.brandPayout.create({
      data: {
        orderItemId,
        brandId: brand.id,
        commissionRuleId: rule.id,
        grossAmount: 1000,
        platformFee: 0,
        gatewayFee: 0,
        netAmount: 1000,
        status: BrandPayoutStatus.AVAILABLE,
      },
    });

    const withdrawRequest = await prisma.withdrawRequest.create({
      data: {
        ownerType: WithdrawOwnerType.BUSINESS,
        brandId: brand.id,
        requestedById: member.id,
        brandBankAccountId: brandBankAccount.id,
        policyId: policy.id,
        amount: 1000,
        status: WithdrawRequestStatus.APPROVED,
      },
    });

    const response = await request(testApp)
      .patch(`/api/withdraw/admin/requests/${withdrawRequest.id}/mark-paid`)
      .set("Authorization", authHeader)
      .send({ referenceNote: "TXN456" });

    expect(response.status).toBe(OK_STATUS);
    const updatedPayout = await prisma.brandPayout.findUniqueOrThrow({
      where: { id: brandPayout.id },
    });
    expect(updatedPayout.status).toBe(BrandPayoutStatus.WITHDRAWN);
  });
});

describe("GET /api/withdraw/admin/requests", () => {
  it("filters by status and includes the owner name", async () => {
    const { authHeader } = await createAdminSession();
    const policy = await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    const bankAccount = await createVerifiedBankAccount(creator.id);
    await createWithdrawRequest(creator, bankAccount.id, policy.id, 1000);
    await createWithdrawRequest(creator, bankAccount.id, policy.id, 500, {
      status: WithdrawRequestStatus.REJECTED,
      rejectionReason: "test",
      reviewedAt: new Date(),
    });

    const response = await request(testApp)
      .get("/api/withdraw/admin/requests")
      .query({ status: "PENDING" })
      .set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].ownerName).toBe(creator.name);
    expect(response.body.data.items[0].bankAccountLast4).toBe("1234");
  });

  it("lists every owner type's requests when no status filter is given", async () => {
    const { authHeader } = await createAdminSession();
    const policy = await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    const bankAccount = await createVerifiedBankAccount(creator.id);
    await createWithdrawRequest(creator, bankAccount.id, policy.id, 1000);

    const brand = await prisma.brand.create({
      data: {
        name: `List Brand ${randomUUID().slice(0, 6)}`,
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
    const bank = await createBank();
    const brandBankAccount = await prisma.brandBankAccount.create({
      data: {
        brandId: brand.id,
        bankId: bank.id,
        accountName: "Brand Account",
        accountNumberCiphertext: "fake.fake.fake",
        accountNumberLast4: "9012",
        branchName: "Branch",
        isDefault: true,
        isVerified: true,
      },
    });
    const businessPolicy = await createOpenPolicy(WithdrawOwnerType.BUSINESS);
    await prisma.withdrawRequest.create({
      data: {
        ownerType: WithdrawOwnerType.BUSINESS,
        brandId: brand.id,
        requestedById: member.id,
        brandBankAccountId: brandBankAccount.id,
        policyId: businessPolicy.id,
        amount: 2000,
      },
    });

    const response = await request(testApp)
      .get("/api/withdraw/admin/requests")
      .set("Authorization", authHeader);

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.items).toHaveLength(2);
    const businessItem = response.body.data.items.find(
      (item: { ownerType: string }) => item.ownerType === "BUSINESS",
    );
    expect(businessItem.ownerName).toBe(brand.name);
    expect(businessItem.bankAccountLast4).toBe("9012");
  });

  it("pages through the admin request list with a cursor", async () => {
    const { authHeader } = await createAdminSession();
    const policy = await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    const bankAccount = await createVerifiedBankAccount(creator.id);
    await createWithdrawRequest(creator, bankAccount.id, policy.id, 1000);
    await createWithdrawRequest(creator, bankAccount.id, policy.id, 500);

    const firstPage = await request(testApp)
      .get("/api/withdraw/admin/requests")
      .query({ limit: 1 })
      .set("Authorization", authHeader);

    expect(firstPage.status).toBe(OK_STATUS);
    expect(firstPage.body.data.items).toHaveLength(1);
    expect(firstPage.body.data.nextCursor).not.toBeNull();

    const secondPage = await request(testApp)
      .get("/api/withdraw/admin/requests")
      .query({ limit: 1, cursor: firstPage.body.data.nextCursor })
      .set("Authorization", authHeader);

    expect(secondPage.status).toBe(OK_STATUS);
    expect(secondPage.body.data.items).toHaveLength(1);
    expect(secondPage.body.data.items[0].id).not.toBe(firstPage.body.data.items[0].id);
  });
});

describe("PUT /api/withdraw/admin/policy", () => {
  it("creates a new active version for the given ownerType and deactivates the previous one", async () => {
    const { authHeader } = await createAdminSession();
    const original = await createOpenPolicy(WithdrawOwnerType.CREATOR, { minAmount: 500 });
    const otherOwnerPolicy = await createOpenPolicy(WithdrawOwnerType.BUSINESS, {
      minAmount: 3000,
    });

    const response = await request(testApp)
      .put("/api/withdraw/admin/policy")
      .set("Authorization", authHeader)
      .send({
        ownerType: "CREATOR",
        minAmount: 1000,
        maxAmount: 200_000,
        windowType: "MONTHLY",
        windowValue: 5,
        maxAttemptsPerWindow: 1,
        cooldownAfterRejectionDays: 7,
        processingNoteText: "Updated note.",
      });

    expect(response.status).toBe(OK_STATUS);
    expect(response.body.data.minAmount).toBe(1000);

    const previous = await prisma.withdrawPolicy.findUniqueOrThrow({ where: { id: original.id } });
    expect(previous.isActive).toBe(false);

    const active = await prisma.withdrawPolicy.findFirstOrThrow({
      where: { ownerType: WithdrawOwnerType.CREATOR, isActive: true },
    });
    expect(active.minAmount).toBe(1000);

    const untouchedBusinessPolicy = await prisma.withdrawPolicy.findUniqueOrThrow({
      where: { id: otherOwnerPolicy.id },
    });
    expect(untouchedBusinessPolicy.isActive).toBe(true);
  });
});
