import { describe, expect, it } from "vitest";

import {
  WithdrawOwnerType,
  WithdrawRequestStatus,
  WithdrawWindowType,
} from "#generated/prisma/enums.js";

import type { WithdrawPolicyRecord, WithdrawRequestRecord } from "./withdraw.types.js";
import {
  toAdminWithdrawRequestView,
  toWithdrawPolicyView,
  toWithdrawRequestView,
} from "./withdraw.utils.js";

const baseRequest: WithdrawRequestRecord = {
  id: "wr-1",
  ownerType: WithdrawOwnerType.CREATOR,
  creatorId: "creator-1",
  brandId: null,
  requestedById: "user-1",
  bankAccountId: "ba-1",
  brandBankAccountId: null,
  policyId: "policy-1",
  amount: 5000,
  status: WithdrawRequestStatus.PENDING,
  rejectionReason: null,
  referenceNote: null,
  requiresSecondSignOff: false,
  firstApprovedById: null,
  firstApprovedAt: null,
  reviewedById: null,
  reviewedAt: null,
  paidAt: null,
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
};

const adminRow = (overrides: Partial<Parameters<typeof toAdminWithdrawRequestView>[0]> = {}) => ({
  ...baseRequest,
  creator: null,
  brand: null,
  bankAccount: null,
  brandBankAccount: null,
  ...overrides,
});

describe("toWithdrawPolicyView", () => {
  it("serialises the policy's fields and the window's next-opens-at date", () => {
    const policy: WithdrawPolicyRecord = {
      id: "policy-1",
      ownerType: WithdrawOwnerType.CREATOR,
      minAmount: 500,
      maxAmount: 100_000,
      windowType: WithdrawWindowType.MONTHLY,
      windowValue: 1,
      maxAttemptsPerWindow: 1,
      cooldownAfterRejectionDays: 7,
      processingNoteText: "Processed within 3 business days.",
      isActive: true,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    const view = toWithdrawPolicyView(policy, {
      isOpen: true,
      windowStart: new Date("2026-05-01T00:00:00.000Z"),
      nextWindowOpensAt: new Date("2026-06-01T00:00:00.000Z"),
    });

    expect(view).toMatchObject({
      ownerType: WithdrawOwnerType.CREATOR,
      minAmount: 500,
      maxAmount: 100_000,
      nextWindowOpensAt: "2026-06-01T00:00:00.000Z",
    });
  });
});

describe("toWithdrawRequestView", () => {
  it("serialises dates and keeps null review/paid timestamps null", () => {
    expect(toWithdrawRequestView(baseRequest)).toMatchObject({
      id: "wr-1",
      createdAt: "2026-05-01T00:00:00.000Z",
      reviewedAt: null,
      paidAt: null,
    });
  });

  it("serialises review and paid timestamps when present", () => {
    const view = toWithdrawRequestView({
      ...baseRequest,
      reviewedAt: new Date("2026-05-03T00:00:00.000Z"),
      paidAt: new Date("2026-05-04T00:00:00.000Z"),
    });
    expect(view.reviewedAt).toBe("2026-05-03T00:00:00.000Z");
    expect(view.paidAt).toBe("2026-05-04T00:00:00.000Z");
  });
});

describe("toAdminWithdrawRequestView", () => {
  it("names a creator-owned request after the creator and their bank account", () => {
    const view = toAdminWithdrawRequestView(
      adminRow({ creator: { name: "Priya" }, bankAccount: { accountNumberLast4: "1234" } }),
    );
    expect(view.ownerName).toBe("Priya");
    expect(view.bankAccountLast4).toBe("1234");
  });

  it("falls back to the brand name and brand bank account when there is no creator", () => {
    const view = toAdminWithdrawRequestView(
      adminRow({ brand: { name: "Kastha" }, brandBankAccount: { accountNumberLast4: "9876" } }),
    );
    expect(view.ownerName).toBe("Kastha");
    expect(view.bankAccountLast4).toBe("9876");
  });

  it("uses placeholders when neither owner nor bank account is joined in", () => {
    const view = toAdminWithdrawRequestView(adminRow());
    expect(view.ownerName).toBe("Unknown");
    expect(view.bankAccountLast4).toBe("----");
  });
});
