import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { WithdrawPolicyPage } from "./WithdrawPolicyPage";

const API_BASE = "http://localhost:3000/api";

const policy = (overrides: Partial<Record<string, unknown>> = {}) => ({
  ownerType: "CREATOR",
  minAmount: 500,
  maxAmount: 50000,
  windowType: "MONTHLY",
  windowValue: 5,
  maxAttemptsPerWindow: 2,
  cooldownAfterRejectionDays: 3,
  processingNoteText: "Processed within 3 working days.",
  nextWindowOpensAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
};

const stubPolicy = (value = policy()) =>
  mswServer.use(http.get(`${API_BASE}/withdraw/policy`, () => okJson(value)));

describe("WithdrawPolicyPage", () => {
  it("fills the form from the current policy", async () => {
    stubPolicy();
    render(<WithdrawPolicyPage />, { wrapper });

    expect(await screen.findByLabelText("Min amount (Rs.)")).toHaveValue("500");
    expect(screen.getByLabelText("Processing note")).toHaveValue(
      "Processed within 3 working days.",
    );
  });

  it("shows inline messages, not a browser popup, when fields are cleared, and sends nothing", async () => {
    stubPolicy();
    const saveRequested = vi.fn();
    mswServer.use(
      http.put(`${API_BASE}/withdraw/admin/policy`, () => {
        saveRequested();
        return okJson(policy());
      }),
    );
    const user = userEvent.setup();
    render(<WithdrawPolicyPage />, { wrapper });

    await user.clear(await screen.findByLabelText("Min amount (Rs.)"));
    await user.clear(screen.getByLabelText("Processing note"));
    await user.click(screen.getByRole("button", { name: "Save policy" }));

    expect(await screen.findByText("Enter a minimum amount.")).toBeInTheDocument();
    expect(screen.getByText("Enter a processing note.")).toBeInTheDocument();
    expect(saveRequested).not.toHaveBeenCalled();
  });

  it("explains a max amount that is not above the min amount", async () => {
    stubPolicy();
    const user = userEvent.setup();
    render(<WithdrawPolicyPage />, { wrapper });

    const maxField = await screen.findByLabelText("Max amount (Rs.)");
    await user.clear(maxField);
    await user.type(maxField, "400");
    await user.click(screen.getByRole("button", { name: "Save policy" }));

    expect(
      await screen.findByText("Max amount must be greater than min amount."),
    ).toBeInTheDocument();
  });

  it("saves a changed policy and shows a success toast", async () => {
    stubPolicy();
    let saveBody: unknown;
    mswServer.use(
      http.put(`${API_BASE}/withdraw/admin/policy`, async ({ request }) => {
        saveBody = await request.json();
        return okJson(policy({ minAmount: 700 }));
      }),
    );
    const user = userEvent.setup();
    render(<WithdrawPolicyPage />, { wrapper });

    const minField = await screen.findByLabelText("Min amount (Rs.)");
    await user.clear(minField);
    await user.type(minField, "700");
    await user.click(screen.getByRole("button", { name: "Save policy" }));

    await waitFor(() => expect(saveBody).toMatchObject({ ownerType: "CREATOR", minAmount: 700 }));
    expect(await screen.findByText("Withdrawal policy saved.")).toBeInTheDocument();
  });

  it("shows the server's reason when saving fails", async () => {
    stubPolicy();
    mswServer.use(
      http.put(`${API_BASE}/withdraw/admin/policy`, () =>
        HttpResponse.json(
          { success: false, message: "Only platform staff can change the policy." },
          { status: 403 },
        ),
      ),
    );
    const user = userEvent.setup();
    render(<WithdrawPolicyPage />, { wrapper });

    await screen.findByLabelText("Min amount (Rs.)");
    await user.click(screen.getByRole("button", { name: "Save policy" }));

    expect(
      await screen.findByText("Only platform staff can change the policy."),
    ).toBeInTheDocument();
  });
});
