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

const unreadableQrPreview = { isQrDetected: true, accountName: null, accountNumber: null };

const previewReturns = (preview: {
  isQrDetected: boolean;
  accountName: string | null;
  accountNumber: string | null;
}) =>
  mswServer.use(
    http.post("/api/bank-qr-verification/preview", () =>
      HttpResponse.json({ success: true, message: "Bank QR read.", data: preview }),
    ),
  );

const createdAccountResponse = (isVerified: boolean) =>
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
        isVerified,
        qrCodeImageUrl: "https://cdn.test/bank-qr.png",
      },
      nameMismatch: false,
    },
  });

const renderModal = (onClose = vi.fn()) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <AddBankAccountModal ownerType="CREATOR" onClose={onClose} />
      <Toaster />
    </QueryClientProvider>,
  );
  return { onClose };
};

const uploadQrCode = async (user: ReturnType<typeof userEvent.setup>) => {
  const fileInput = screen
    .getByRole("dialog")
    .querySelector<HTMLInputElement>('input[type="file"]');
  if (!fileInput) throw new Error("QR upload input not found");
  const qrFile = new File(["qr"], "bank-qr.png", { type: "image/png" });
  await user.upload(fileInput, qrFile);
  await screen.findByRole("button", { name: "Remove image" });
};

const fillValidForm = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.selectOptions(screen.getByLabelText("Bank"), "bank-1");
  await user.type(screen.getByLabelText("Account holder name"), "Sabin Shrestha");
  await user.type(screen.getByLabelText("Account number"), "1234567890");
  await user.type(screen.getByLabelText("Confirm account number"), "1234567890");
  await user.type(screen.getByLabelText("Branch"), "Kathmandu");
  await uploadQrCode(user);
};

describe("AddBankAccountModal", () => {
  beforeEach(() => {
    mockBanks();
    mswServer.use(
      http.post("/api/uploads", () =>
        HttpResponse.json({
          success: true,
          message: "ok",
          data: { files: [{ url: "https://cdn.test/bank-qr.png", key: "bank-qr" }] },
        }),
      ),
      http.post("/api/bank-qr-verification/preview", () =>
        HttpResponse.json({ success: true, message: "Bank QR read.", data: unreadableQrPreview }),
      ),
    );
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

  it("shows friendly messages for too-short fields instead of raw schema text", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.selectOptions(screen.getByLabelText("Bank"), "bank-1");
    await user.type(screen.getByLabelText("Account holder name"), "A");
    await user.type(screen.getByLabelText("Account number"), "123");
    await user.type(screen.getByLabelText("Confirm account number"), "123");
    await user.type(screen.getByLabelText("Branch"), "K");
    await user.click(screen.getByRole("button", { name: "Add bank account" }));

    expect(await screen.findByText("Enter the account holder's name.")).toBeInTheDocument();
    expect(screen.getByText("Account number must be at least 6 digits.")).toBeInTheDocument();
    expect(screen.getByText("Enter the branch name.")).toBeInTheDocument();
    expect(screen.queryByText(/expected string to have/)).not.toBeInTheDocument();
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
              qrCodeImageUrl: null,
            },
            nameMismatch: true,
          },
        }),
      ),
    );

    const user = userEvent.setup();
    const { onClose } = renderModal();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Add bank account" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(await screen.findByText(/doesn't match your profile name/)).toBeInTheDocument();
  });

  it("fills in the holder name read from the uploaded QR", async () => {
    previewReturns({ isQrDetected: true, accountName: "SABIN SHRESTHA", accountNumber: null });
    const user = userEvent.setup();
    renderModal();

    await uploadQrCode(user);

    await waitFor(() =>
      expect(screen.getByLabelText("Account holder name")).toHaveValue("SABIN SHRESTHA"),
    );
    expect(screen.getByText(/We read your QR and filled in what it shows/)).toBeInTheDocument();
  });

  it("does not overwrite a name the person already typed", async () => {
    previewReturns({ isQrDetected: true, accountName: "SABIN SHRESTHA", accountNumber: null });
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText("Account holder name"), "Sabin Shrestha");
    await uploadQrCode(user);

    await screen.findByText(/We read your QR and filled in what it shows/);
    expect(screen.getByLabelText("Account holder name")).toHaveValue("Sabin Shrestha");
  });

  it("tells the person when the uploaded photo has no QR code", async () => {
    previewReturns({ isQrDetected: false, accountName: null, accountNumber: null });
    const user = userEvent.setup();
    renderModal();

    await uploadQrCode(user);

    expect(await screen.findByText(/couldn't find a QR code in that photo/)).toBeInTheDocument();
  });

  it("keeps the form usable when reading the QR fails", async () => {
    mswServer.use(
      http.post("/api/bank-qr-verification/preview", () =>
        HttpResponse.json({ success: false, message: "Too many QR reads." }, { status: 429 }),
      ),
    );
    const user = userEvent.setup();
    renderModal();

    await uploadQrCode(user);

    await waitFor(() => expect(screen.queryByText("Reading your QR…")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Account holder name")).toHaveValue("");
  });

  it("says the account is verified when the QR matched", async () => {
    mswServer.use(http.post("/api/bank-accounts", () => createdAccountResponse(true)));
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Add bank account" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(
      await screen.findByText("Bank account added and verified from your QR."),
    ).toBeInTheDocument();
  });

  it("says the account is waiting for verification when the QR didn't match", async () => {
    mswServer.use(http.post("/api/bank-accounts", () => createdAccountResponse(false)));
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "Add bank account" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    expect(
      await screen.findByText("Bank account added. We'll verify it shortly."),
    ).toBeInTheDocument();
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
