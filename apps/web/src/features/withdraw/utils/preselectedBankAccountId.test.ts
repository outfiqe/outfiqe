import { describe, expect, it } from "vitest";

import type { BankAccount } from "@/features/bank-accounts";

import { pickPreselectedBankAccountId } from "./preselectedBankAccountId";

const buildBankAccount = (overrides: Partial<BankAccount>): BankAccount => ({
  id: "bank-account-1",
  bankId: "bank-1",
  bankName: "City Bank",
  accountName: "Sara Bennett",
  accountNumberLast4: "0123",
  branchName: "Main Branch",
  qrCodeImageUrl: null,
  isDefault: false,
  isVerified: true,
  ...overrides,
});

describe("pickPreselectedBankAccountId", () => {
  it("picks the default account when there is one", () => {
    const accounts = [
      buildBankAccount({ id: "first" }),
      buildBankAccount({ id: "default", isDefault: true }),
    ];

    expect(pickPreselectedBankAccountId(accounts)).toBe("default");
  });

  it("picks the only account even when it isn't marked default", () => {
    expect(pickPreselectedBankAccountId([buildBankAccount({ id: "only" })])).toBe("only");
  });

  it("leaves the choice empty when several accounts have no default", () => {
    const accounts = [buildBankAccount({ id: "first" }), buildBankAccount({ id: "second" })];

    expect(pickPreselectedBankAccountId(accounts)).toBe("");
  });

  it("leaves the choice empty when there are no accounts", () => {
    expect(pickPreselectedBankAccountId([])).toBe("");
  });
});
