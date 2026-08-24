import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNepalBanks } from "@/features/nepal-banks";

import { AddBankAccountModal } from "./AddBankAccountModal";

vi.mock("@/features/nepal-banks", () => ({
  useNepalBanks: vi.fn(),
}));

const mockBanks = () => {
  vi.mocked(useNepalBanks).mockReturnValue({
    data: [{ id: "bank-1", name: "Nepal Bank", code: "NBL", type: "COMMERCIAL", logoUrl: null }],
    isPending: false,
  } as ReturnType<typeof useNepalBanks>);
};

const renderModal = (onClose = vi.fn()) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AddBankAccountModal ownerType="CREATOR" onClose={onClose} />
      <Toaster />
    </QueryClientProvider>,
  );
  return onClose;
};

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.selectOptions(screen.getByLabelText("Bank"), "bank-1");
  await user.type(screen.getByLabelText("Account holder name"), "Sabin Shrestha");
  await user.type(screen.getByLabelText("Account number"), "1234567890");
  await user.type(screen.getByLabelText("Confirm account number"), "1234567890");
  await user.type(screen.getByLabelText("Branch"), "Kathmandu");
};

describe("AddBankAccountModal", () => {
  beforeEach(() => {
    mockBanks();
  });

  it("rejects mismatched account numbers before submitting", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.selectOptions(screen.getByLabelText("Bank"), "bank-1");
    await user.type(screen.getByLabelText("Account holder name"), "Sabin Shrestha");
    await user.type(screen.getByLabelText("Account number"), "1234567890");
    await user.type(screen.getByLabelText("Confirm account number"), "0000000000");
    await user.type(screen.getByLabelText("Branch"), "Kathmandu");
    await user.click(screen.getByRole("button", { name: "Add bank account" }));

    expect(await screen.findByText("Account numbers do not match.")).toBeInTheDocument();
  });

  it("adds the account, warns on a name mismatch, and closes", async () => {
    mswServer.use(
      http.post("/api/bank-accounts", () =>
        HttpResponse.json({
          success: true,
          message: "Bank account added.",
          data: {
            bankAccount: {
              id: "account-1",
              bankId: "bank-1",
              bankName: "Nepal Bank",
              accountName: "Sabin Shrestha",
              accountNumberLast4: "7890",
              branchName: "Kathmandu",
              isDefault: true,
              isVerified: false,
            },
            nameMismatch: true,
          },
        }),
      ),
    );

    const user = userEvent.setup();
    const onClose = renderModal();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Add bank account" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(await screen.findByText(/doesn't match your profile name/)).toBeInTheDocument();
  });

  it("shows the backend's error message on failure", async () => {
    mswServer.use(
      http.post("/api/bank-accounts", () =>
        HttpResponse.json(
          {
            success: false,
            message: "This bank isn't available for selection.",
            code: "BANK_NOT_FOUND",
          },
          { status: 404 },
        ),
      ),
    );

    const user = userEvent.setup();
    renderModal();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Add bank account" }));

    expect(await screen.findByText("This bank isn't available for selection.")).toBeInTheDocument();
  });
});
