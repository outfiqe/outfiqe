import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { GatewayFeeRatesSection } from "./GatewayFeeRatesSection";

const API_BASE = "*/api";

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const stubRates = () => {
  mswServer.use(
    http.get(`${API_BASE}/brand-payouts/gateway-fee-rates`, () =>
      HttpResponse.json({
        success: true,
        data: [
          {
            id: "r1",
            paymentMethod: "ESEWA",
            ratePercent: 2.5,
            isActive: true,
            createdAt: "2026-01-01T00:00:00.000Z",
          },
        ],
      }),
    ),
  );
};

const getProviderForm = (providerLabel: string) => {
  const form = screen.getByText(providerLabel).closest("form");
  if (!form) throw new Error(`No rate form for "${providerLabel}"`);
  return within(form);
};

describe("GatewayFeeRatesSection", () => {
  it("shows a skeleton for the current rate until it resolves", () => {
    stubRates();

    render(<GatewayFeeRatesSection />, { wrapper });

    expect(screen.getAllByRole("status", { name: "Loading current rate" })).toHaveLength(2);
  });

  it("shows the active rate for a configured provider and a fallback for an unconfigured one", async () => {
    stubRates();

    render(<GatewayFeeRatesSection />, { wrapper });

    expect(await screen.findByText("Current estimate: 2.5%")).toBeInTheDocument();
    expect(screen.getByText("No rate configured yet.")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "Loading current rate" })).not.toBeInTheDocument();
  });

  it("submits a new rate for a provider", async () => {
    const user = userEvent.setup();
    const postBody = vi.fn();
    stubRates();
    mswServer.use(
      http.post(`${API_BASE}/brand-payouts/gateway-fee-rates`, async ({ request }) => {
        postBody(await request.json());
        return HttpResponse.json({
          success: true,
          data: {
            id: "r2",
            paymentMethod: "KHALTI",
            ratePercent: 3,
            isActive: true,
            createdAt: "2026-02-01T00:00:00.000Z",
          },
        });
      }),
    );

    render(<GatewayFeeRatesSection />, { wrapper });

    await screen.findByText("No rate configured yet.");
    const khaltiForm = getProviderForm("Khalti");
    await user.type(khaltiForm.getByRole("spinbutton"), "3");
    await user.click(khaltiForm.getByRole("button", { name: "Update" }));

    await waitFor(() =>
      expect(postBody).toHaveBeenCalledWith({ paymentMethod: "KHALTI", ratePercent: 3 }),
    );
  });

  it("shows an error banner when saving a rate fails", async () => {
    const user = userEvent.setup();
    stubRates();
    mswServer.use(
      http.post(
        `${API_BASE}/brand-payouts/gateway-fee-rates`,
        () =>
          new HttpResponse(JSON.stringify({ success: false, message: "Rate too high" }), {
            status: 400,
          }),
      ),
    );

    render(<GatewayFeeRatesSection />, { wrapper });

    await screen.findByText("No rate configured yet.");
    const khaltiForm = getProviderForm("Khalti");
    await user.type(khaltiForm.getByRole("spinbutton"), "9");
    await user.click(khaltiForm.getByRole("button", { name: "Update" }));

    expect(await khaltiForm.findByText("Rate too high")).toBeInTheDocument();
  });
});
