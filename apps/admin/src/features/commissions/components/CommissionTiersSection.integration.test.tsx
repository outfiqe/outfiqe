import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { CommissionTiersSection } from "./CommissionTiersSection";

const API_BASE = "http://localhost:3000/api";

const tier = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "tier-1",
  scope: "CREATOR_LOOK",
  minPrice: 0,
  maxPrice: 2000,
  amount: 100,
  sortOrder: 0,
  overlapsWithTierIds: [],
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

const stubTiers = (tiers: ReturnType<typeof tier>[] = []) =>
  mswServer.use(http.get(`${API_BASE}/commissions/tiers`, () => okJson(tiers)));

const renderCreatorLookTiers = () =>
  render(<CommissionTiersSection scope="CREATOR_LOOK" />, { wrapper });

describe("CommissionTiersSection", () => {
  it("asks for the Build tiers when showing Build commission, and warns about overlapping bands", async () => {
    let requestedScope: string | null = null;
    mswServer.use(
      http.get(`${API_BASE}/commissions/tiers`, ({ request }) => {
        requestedScope = new URL(request.url).searchParams.get("scope");
        return okJson([
          tier({ id: "tier-1", scope: "OUTFIT_BUILD", overlapsWithTierIds: ["tier-2"] }),
          tier({
            id: "tier-2",
            scope: "OUTFIT_BUILD",
            minPrice: 1500,
            overlapsWithTierIds: ["tier-1"],
          }),
        ]);
      }),
    );

    render(<CommissionTiersSection scope="OUTFIT_BUILD" />, { wrapper });

    expect(await screen.findByRole("heading", { name: "Build commission" })).toBeInTheDocument();
    expect(await screen.findAllByText("Overlaps another price band")).toHaveLength(2);
    expect(screen.getByText(/Some price bands overlap/)).toBeInTheDocument();
    expect(requestedScope).toBe("OUTFIT_BUILD");
  });

  it("names the missing fields inline, not in a browser popup, and sends nothing", async () => {
    stubTiers();
    const createRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/commissions/tiers`, () => {
        createRequested();
        return okJson(tier());
      }),
    );
    const user = userEvent.setup();
    renderCreatorLookTiers();

    await user.click(await screen.findByRole("button", { name: "Add tier" }));

    expect(await screen.findByText("Enter a minimum price.")).toBeInTheDocument();
    expect(screen.getByText("Enter a commission amount.")).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("explains a max price that is not above the min price", async () => {
    stubTiers();
    const createRequested = vi.fn();
    mswServer.use(
      http.post(`${API_BASE}/commissions/tiers`, () => {
        createRequested();
        return okJson(tier());
      }),
    );
    const user = userEvent.setup();
    renderCreatorLookTiers();

    await user.type(await screen.findByLabelText("Min price (Rs.)"), "500");
    await user.type(screen.getByLabelText("Max price (Rs.)"), "400");
    await user.type(screen.getByLabelText("Commission (Rs.)"), "50");
    await user.click(screen.getByRole("button", { name: "Add tier" }));

    expect(
      await screen.findByText("Max price must be greater than min price."),
    ).toBeInTheDocument();
    expect(createRequested).not.toHaveBeenCalled();
  });

  it("adds a tier, clears the form and shows a success toast", async () => {
    stubTiers();
    let createBody: unknown;
    let createdScope: string | null = null;
    mswServer.use(
      http.post(`${API_BASE}/commissions/tiers`, async ({ request }) => {
        createBody = await request.json();
        createdScope = new URL(request.url).searchParams.get("scope");
        return okJson(tier());
      }),
    );
    const user = userEvent.setup();
    renderCreatorLookTiers();

    const minField = await screen.findByLabelText("Min price (Rs.)");
    await user.type(minField, "0");
    await user.type(screen.getByLabelText("Commission (Rs.)"), "100");
    await user.click(screen.getByRole("button", { name: "Add tier" }));

    await waitFor(() => expect(createBody).toEqual({ minPrice: 0, amount: 100 }));
    expect(createdScope).toBe("CREATOR_LOOK");
    expect(await screen.findByText("Commission tier added.")).toBeInTheDocument();
    await waitFor(() => expect(minField).toHaveValue(""));
  });

  it("shows the server's reason when a tier overlaps another", async () => {
    stubTiers();
    mswServer.use(
      http.post(`${API_BASE}/commissions/tiers`, () =>
        HttpResponse.json(
          { success: false, message: "That price band overlaps an existing tier." },
          { status: 409 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderCreatorLookTiers();

    await user.type(await screen.findByLabelText("Min price (Rs.)"), "0");
    await user.type(screen.getByLabelText("Commission (Rs.)"), "100");
    await user.click(screen.getByRole("button", { name: "Add tier" }));

    expect(
      await screen.findByText("That price band overlaps an existing tier."),
    ).toBeInTheDocument();
  });
});
