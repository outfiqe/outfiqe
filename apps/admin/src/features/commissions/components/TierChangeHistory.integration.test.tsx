import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { TierChangeHistory } from "./TierChangeHistory";

const API_BASE = "http://localhost:3000/api";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const storedTier = (amount: number) => ({
  id: "tier-1",
  scope: "OUTFIT_BUILD",
  minPrice: 0,
  maxPrice: 3000,
  amount,
  sortOrder: 0,
});

describe("TierChangeHistory", () => {
  it("lists each change with what the band was and what it became", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions/tiers/history`, () =>
        okJson({
          items: [
            {
              id: "change-2",
              action: "commission-tier.updated",
              actorName: "Anjali",
              summary: "Changed a tier",
              before: storedTier(40),
              after: storedTier(55),
              createdAt: "2026-10-02T10:00:00.000Z",
            },
            {
              id: "change-1",
              action: "commission-tier.created",
              actorName: "Anjali",
              summary: "Added a tier",
              before: null,
              after: storedTier(40),
              createdAt: "2026-10-01T10:00:00.000Z",
            },
          ],
          nextCursor: null,
        }),
      ),
    );

    render(<TierChangeHistory scope="OUTFIT_BUILD" />, { wrapper });

    expect(
      await screen.findByText("Rs. 0 – Rs. 3,000 → Rs. 40 ⟶ Rs. 0 – Rs. 3,000 → Rs. 55"),
    ).toBeInTheDocument();
    expect(screen.getByText("Added Rs. 0 – Rs. 3,000 → Rs. 40")).toBeInTheDocument();
  });

  it("says when nothing has changed yet", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions/tiers/history`, () =>
        okJson({ items: [], nextCursor: null }),
      ),
    );

    render(<TierChangeHistory scope="CREATOR_LOOK" />, { wrapper });

    expect(await screen.findByText("No changes yet.")).toBeInTheDocument();
  });

  it("says when the history couldn't load", async () => {
    mswServer.use(
      http.get(`${API_BASE}/commissions/tiers/history`, () =>
        HttpResponse.json({ success: false, message: "Server error." }, { status: 500 }),
      ),
    );

    render(<TierChangeHistory scope="CREATOR_LOOK" />, { wrapper });

    expect(await screen.findByText("Couldn't load the change history.")).toBeInTheDocument();
  });
});
