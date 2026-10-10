import { randomUUID } from "node:crypto";

import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { HTTP_STATUS } from "#constants/http.constants.js";
import { prisma } from "#db/prisma.js";
import { UserRole, WithdrawOwnerType, WithdrawRequestStatus } from "#generated/prisma/enums.js";
import { redis } from "#redis/redis.client.js";
import { testApp } from "#test/integration/test-app.js";
import {
  authHeaderFor,
  createBrandWithMember,
  createClosedPolicy,
  createOpenPolicy,
  createUser,
  createVerifiedBankAccount,
  createVerifiedBrandBankAccount,
  grantAvailableBrandPayout,
  grantAvailableCommission,
} from "#test/integration/withdraw-fixtures.js";

beforeEach(async () => {
  await redis.flushdb();
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

    expect(response.status).toBe(HTTP_STATUS.OK);
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

    expect(response.status).toBe(HTTP_STATUS.OK);
    expect(response.body.data.windowOpen).toBe(false);
  });

  it("forbids a shopper who is not an approved muse from the muse withdraw flow", async () => {
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

describe("POST /api/withdraw/requests — muse", () => {
  it("creates a PENDING request within policy bounds and balance", async () => {
    await createOpenPolicy(WithdrawOwnerType.CREATOR);
    const creator = await createUser();
    await grantAvailableCommission(creator.id, 5000);
    const bankAccount = await createVerifiedBankAccount(creator.id);

    const response = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeaderFor(creator.id, UserRole.CUSTOMER))
      .send({ ownerType: "CREATOR", bankAccountId: bankAccount.id, amount: 1000 });

    expect(response.status).toBe(HTTP_STATUS.CREATED);
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

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
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

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
    expect(response.body.code).toBe("AMOUNT_TOO_LOW");
  });

  it("hard-rejects an amount above the policy maximum for a muse", async () => {
    await createOpenPolicy(WithdrawOwnerType.CREATOR, { maxAmount: 1000 });
    const creator = await createUser();
    await grantAvailableCommission(creator.id, 5000);
    const bankAccount = await createVerifiedBankAccount(creator.id);

    const response = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeaderFor(creator.id, UserRole.CUSTOMER))
      .send({ ownerType: "CREATOR", bankAccountId: bankAccount.id, amount: 2000 });

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
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

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
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

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
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
    expect(first.status).toBe(HTTP_STATUS.CREATED);

    const second = await request(testApp)
      .post("/api/withdraw/requests")
      .set("Authorization", authHeader)
      .send({ ownerType: "CREATOR", bankAccountId: bankAccount.id, amount: 500 });

    expect(second.status).toBe(HTTP_STATUS.BAD_REQUEST);
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

    expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST);
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

    expect(response.status).toBe(HTTP_STATUS.CREATED);
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

    expect(response.status).toBe(HTTP_STATUS.CREATED);
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

    expect(response.status).toBe(HTTP_STATUS.CREATED);
    expect(response.body.data.status).toBe(WithdrawRequestStatus.PENDING);

    const persisted = await prisma.withdrawPolicy.findFirst({
      where: { ownerType: WithdrawOwnerType.BUSINESS, isActive: true },
    });
    expect(persisted).not.toBeNull();
    expect(persisted?.minAmount).toBe(3_000);
    expect(persisted?.updatedById).toBeNull();
  });
});

describe("POST /api/withdraw/requests — concurrent double-spend guard", () => {
  it("never lets two simultaneous requests together reserve more than the available balance", async () => {
    await createOpenPolicy(WithdrawOwnerType.BUSINESS, { maxAttemptsPerWindow: 5 });
    const { brand, member } = await createBrandWithMember();
    await grantAvailableBrandPayout(brand.id, 10_000);
    const bankAccount = await createVerifiedBrandBankAccount(brand.id);
    const authHeader = authHeaderFor(member.id, UserRole.BRAND_OWNER);

    const submitWithdrawRequest = () =>
      request(testApp)
        .post("/api/withdraw/requests")
        .set("Authorization", authHeader)
        .send({ ownerType: "BUSINESS", bankAccountId: bankAccount.id, amount: 6_000 });

    const [first, second] = await Promise.all([submitWithdrawRequest(), submitWithdrawRequest()]);

    const statuses = [first.status, second.status].sort();
    expect(statuses[0]).toBe(HTTP_STATUS.CREATED);
    expect([HTTP_STATUS.BAD_REQUEST, HTTP_STATUS.CONFLICT]).toContain(statuses[1]);

    const reservedRequests = await prisma.withdrawRequest.findMany({
      where: {
        brandId: brand.id,
        status: { in: [WithdrawRequestStatus.PENDING, WithdrawRequestStatus.UNDER_REVIEW] },
      },
    });
    expect(reservedRequests).toHaveLength(1);
    const totalReserved = reservedRequests.reduce((sum, row) => sum + row.amount, 0);
    expect(totalReserved).toBeLessThanOrEqual(10_000);
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

    expect(response.status).toBe(HTTP_STATUS.OK);
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

    expect(firstPage.status).toBe(HTTP_STATUS.OK);
    expect(firstPage.body.data.items).toHaveLength(1);
    expect(firstPage.body.data.nextCursor).not.toBeNull();

    const secondPage = await request(testApp)
      .get("/api/withdraw/requests")
      .query({ ownerType: "CREATOR", limit: 1, cursor: firstPage.body.data.nextCursor })
      .set("Authorization", authHeader);

    expect(secondPage.status).toBe(HTTP_STATUS.OK);
    expect(secondPage.body.data.items).toHaveLength(1);
    expect(secondPage.body.data.items[0].id).not.toBe(firstPage.body.data.items[0].id);
  });
});
