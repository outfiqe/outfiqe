import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import type { BankAccount } from "@/features/bank-accounts";

import type { WithdrawEligibility } from "../api/withdrawSchemas";
import { WithdrawRequestForm } from "./WithdrawRequestForm";

const bankAccount: BankAccount = {
  id: "bank-account-1",
  bankId: "bank-1",
  bankName: "Nepal Bank",
  accountName: "Sabin Shrestha",
  accountNumberLast4: "1234",
  branchName: "Kathmandu",
  isDefault: true,
  isVerified: true,
};

const eligibility: WithdrawEligibility = {
  windowOpen: true,
  nextWindowOpensAt: "2026-09-01T00:00:00.000Z",
  attemptsUsed: 0,
  attemptsRemaining: 1,
  minAmount: 500,
  maxAmount: 100_000,
  availableBalance: 5000,
  hasVerifiedBankAccount: true,
  cooldownActive: false,
  cooldownEndsAt: null,
};

const renderForm = (
  overrides: {
    verifiedBankAccounts?: BankAccount[];
    eligibility?: Partial<WithdrawEligibility>;
  } = {},
) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WithdrawRequestForm
        ownerType="CREATOR"
        verifiedBankAccounts={overrides.verifiedBankAccounts ?? [bankAccount]}
        eligibility={{ ...eligibility, ...overrides.eligibility }}
      />
    </QueryClientProvider>,
  );
};

describe("WithdrawRequestForm", () => {
  it("asks for a verified bank account when none exist", () => {
    renderForm({ verifiedBankAccounts: [] });

    expect(
      screen.getByText("Add and verify a bank account above before requesting a withdrawal."),
    ).toBeInTheDocument();
  });

  it("explains the closed window instead of showing the form", () => {
    renderForm({ eligibility: { windowOpen: false } });

    expect(screen.getByText(/withdrawal window isn't open right now/)).toBeInTheDocument();
  });

  it("explains an active cooldown instead of showing the form", () => {
    renderForm({ eligibility: { cooldownActive: true } });

    expect(
      screen.getByText("You're still in the cooldown period after a recent rejection."),
    ).toBeInTheDocument();
  });

  it("explains exhausted attempts instead of showing the form", () => {
    renderForm({ eligibility: { attemptsRemaining: 0 } });

    expect(
      screen.getByText("You've reached the withdrawal limit for this window."),
    ).toBeInTheDocument();
  });

  it("submits a request through the real API and confirms success", async () => {
    mswServer.use(
      http.post("/api/withdraw/requests", async ({ request }) => {
        const body = (await request.json()) as {
          ownerType: string;
          bankAccountId: string;
          amount: number;
        };
        expect(body).toMatchObject({
          ownerType: "CREATOR",
          bankAccountId: "bank-account-1",
          amount: 1000,
        });
        return HttpResponse.json({
          success: true,
          message: "Withdrawal request submitted.",
          data: {
            id: "request-1",
            ownerType: "CREATOR",
            amount: 1000,
            status: "PENDING",
            rejectionReason: null,
            referenceNote: null,
            requiresSecondSignOff: false,
            createdAt: "2026-08-24T00:00:00.000Z",
            reviewedAt: null,
            paidAt: null,
          },
        });
      }),
    );

    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText("Bank account"), "bank-account-1");
    const amountInput = screen.getByLabelText("Amount (Rs.)");
    await user.clear(amountInput);
    await user.type(amountInput, "1000");
    await user.click(screen.getByRole("button", { name: "Request withdrawal" }));

    expect(await screen.findByRole("button", { name: "Request withdrawal" })).not.toBeDisabled();
  });

  it("shows the backend's error message when the request fails", async () => {
    mswServer.use(
      http.post("/api/withdraw/requests", () =>
        HttpResponse.json(
          {
            success: false,
            message: "This amount exceeds your available balance.",
            code: "INSUFFICIENT_BALANCE",
          },
          { status: 400 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText("Bank account"), "bank-account-1");
    const amountInput = screen.getByLabelText("Amount (Rs.)");
    await user.clear(amountInput);
    await user.type(amountInput, "999999");
    await user.click(screen.getByRole("button", { name: "Request withdrawal" }));

    expect(
      await screen.findByText("This amount exceeds your available balance."),
    ).toBeInTheDocument();
  });
});
