import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { TierPriceTestBox } from "./TierPriceTestBox";

const API_BASE = "http://localhost:3000/api";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("TierPriceTestBox", () => {
  it("shows the commission a price earns in the chosen commission type", async () => {
    let requestedQuery = "";
    mswServer.use(
      http.get(`${API_BASE}/commissions/tiers/price-test`, ({ request }) => {
        requestedQuery = new URL(request.url).search;
        return okJson({ price: 2500, tierId: "tier-1", amount: 60 });
      }),
    );
    const user = userEvent.setup();
    render(<TierPriceTestBox scope="OUTFIT_BUILD" />, { wrapper });

    await user.type(screen.getByLabelText("Test a price"), "2500");
    await user.click(screen.getByRole("button", { name: "Check" }));

    expect(await screen.findByText("Rs. 2,500 earns Rs. 60 commission.")).toBeInTheDocument();
    expect(requestedQuery).toBe("?scope=OUTFIT_BUILD&price=2500");
  });

  it("says when a price falls outside every band", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions/tiers/price-test`, () =>
        okJson({ price: 9, tierId: null, amount: 0 }),
      ),
    );
    const user = userEvent.setup();
    render(<TierPriceTestBox scope="CREATOR_LOOK" />, { wrapper });

    await user.type(screen.getByLabelText("Test a price"), "9");
    await user.click(screen.getByRole("button", { name: "Check" }));

    expect(
      await screen.findByText("Rs. 9 isn't in any band, so it earns no commission."),
    ).toBeInTheDocument();
  });

  it("asks for whole rupees before checking anything", async () => {
    const user = userEvent.setup();
    render(<TierPriceTestBox scope="CREATOR_LOOK" />, { wrapper });

    await user.type(screen.getByLabelText("Test a price"), "12.5");
    await user.click(screen.getByRole("button", { name: "Check" }));

    expect(screen.getByText("Enter the price in whole rupees.")).toBeInTheDocument();
  });
});
