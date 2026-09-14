import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { WithdrawEligibility, WithdrawPolicy } from "../api/withdrawSchemas";
import { WithdrawPolicyPanel } from "./WithdrawPolicyPanel";

const policy: WithdrawPolicy = {
  ownerType: "BUSINESS",
  minAmount: 500,
  maxAmount: 100_000,
  windowType: "CUSTOM_DAYS",
  windowValue: 14,
  maxAttemptsPerWindow: 1,
  cooldownAfterRejectionDays: 7,
  processingNoteText: "Processed within 5 business days.",
  nextWindowOpensAt: "2026-09-01T00:00:00.000Z",
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

describe("WithdrawPolicyPanel", () => {
  it("shows the available balance and policy details once loaded", () => {
    render(
      <WithdrawPolicyPanel
        policy={policy}
        eligibility={eligibility}
        isLoading={false}
        isError={false}
      />,
    );

    expect(screen.getByText("Available balance")).toBeInTheDocument();
    expect(screen.getByText("Rs. 5,000")).toBeInTheDocument();
  });

  it("shows an error banner instead of a permanent skeleton when the fetch fails", () => {
    render(
      <WithdrawPolicyPanel
        policy={undefined}
        eligibility={undefined}
        isLoading={false}
        isError={true}
      />,
    );

    expect(
      screen.getByText("We couldn't load your withdrawal balance right now. Please try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Available balance")).not.toBeInTheDocument();
  });
});
