import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BankAccount } from "../api/bankAccountSchemas";
import { BankAccountCard } from "./BankAccountCard";

const aBankAccount = (overrides: Partial<BankAccount> = {}): BankAccount => ({
  id: "account-1",
  bankId: "bank-1",
  bankName: "Nepal Bank",
  accountName: "Sabin Shrestha",
  accountNumberLast4: "1234",
  branchName: "Kathmandu",
  qrCodeImageUrl: null,
  isDefault: false,
  isVerified: false,
  ...overrides,
});

const renderCard = (bankAccount: BankAccount) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BankAccountCard ownerType="CREATOR" bankAccount={bankAccount} />
    </QueryClientProvider>,
  );
};

describe("BankAccountCard", () => {
  it("shows a pending-verification badge and a bank icon when there's no QR code", () => {
    renderCard(aBankAccount());

    expect(screen.getByText("Pending verification")).toBeInTheDocument();
    expect(screen.queryByLabelText("View bank QR code")).not.toBeInTheDocument();
  });

  it("shows the uploaded QR code as a link to the full image, and no pending badge once verified", () => {
    renderCard(aBankAccount({ isVerified: true, qrCodeImageUrl: "https://cdn.test/qr.png" }));

    expect(screen.queryByText("Pending verification")).not.toBeInTheDocument();
    expect(screen.getByLabelText("View bank QR code")).toHaveAttribute(
      "href",
      "https://cdn.test/qr.png",
    );
  });

  it("shows a Default badge and no 'set as default' action for the default account", () => {
    renderCard(aBankAccount({ isDefault: true, isVerified: true }));

    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Set as default" })).not.toBeInTheDocument();
  });
});
