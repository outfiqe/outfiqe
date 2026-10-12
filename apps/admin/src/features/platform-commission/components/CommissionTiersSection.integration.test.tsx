import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { CommissionTiersSection } from "./CommissionTiersSection";

const API_BASE = "http://localhost:3000/api";

const rule = (tiers: Record<string, unknown>[]) => ({
  id: "rule-1",
  isActive: true,
  createdAt: "2026-09-01T00:00:00.000Z",
  tiers,
});

const percentTier = {
  id: "t1",
  minPrice: 0,
  maxPrice: null,
  feeType: "PERCENT",
  flatAmount: null,
  ratePercent: 8,
};

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

const stubRules = (rules: ReturnType<typeof rule>[]) =>
  mswServer.use(http.get(`${API_BASE}/brand-payouts/commission-rules`, () => okJson(rules)));

describe("platform CommissionTiersSection", () => {
  it("shows the message under the field, not a browser popup, when a rate is missing", async () => {
    stubRules([]);
    const saveRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/brand-payouts/commission-rules`, () => {
        saveRequested();
        return okJson(rule([percentTier]));
      }),
    );
    const user = userEvent.setup();
    render(<CommissionTiersSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Save as new version" }));

    expect(await screen.findByText("Enter a commission rate.")).toBeInTheDocument();
    expect(saveRequested).not.toHaveBeenCalled();
  });

  it("explains a ladder that does not end with an open band", async () => {
    stubRules([rule([{ ...percentTier, maxPrice: 500 }])]);
    const saveRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/brand-payouts/commission-rules`, () => {
        saveRequested();
        return okJson(rule([percentTier]));
      }),
    );
    const user = userEvent.setup();
    render(<CommissionTiersSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Save as new version" }));

    expect(
      await screen.findByText("The highest band must be open-ended — leave its max price blank."),
    ).toBeInTheDocument();
    expect(saveRequested).not.toHaveBeenCalled();
  });

  it("saves a valid ladder and shows a success toast", async () => {
    stubRules([rule([percentTier])]);
    let saveBody: unknown;
    mswServer.use(
      http.post(`${API_BASE}/brand-payouts/commission-rules`, async ({ request }) => {
        saveBody = await request.json();
        return okJson(rule([percentTier]));
      }),
    );
    const user = userEvent.setup();
    render(<CommissionTiersSection />, { wrapper });

    await user.click(await screen.findByRole("button", { name: "Save as new version" }));

    await waitFor(() => expect(saveBody).toBeDefined());
    expect(await screen.findByText("New commission ladder saved.")).toBeInTheDocument();
  });

  it("rejects a percentage above 100 under the field", async () => {
    stubRules([rule([percentTier])]);
    const user = userEvent.setup();
    render(<CommissionTiersSection />, { wrapper });

    const rateField = await screen.findByLabelText("Commission (%)");
    await user.clear(rateField);
    await user.type(rateField, "150");
    await user.click(screen.getByRole("button", { name: "Save as new version" }));

    const alerts = await screen.findAllByRole("alert");
    expect(
      within(alerts[0] as HTMLElement).getByText("Use a number up to 100."),
    ).toBeInTheDocument();
  });
});
