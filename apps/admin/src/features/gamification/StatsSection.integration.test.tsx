import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { StatsSection } from "./StatsSection";

const API_BASE = "*/api";

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const stubStats = () => {
  mswServer.use(
    http.get(`${API_BASE}/xp/stats`, () =>
      HttpResponse.json({
        success: true,
        data: { totalXpAwarded: 12500, usersWithProgress: 42 },
      }),
    ),
    http.get(`${API_BASE}/badges/stats`, () =>
      HttpResponse.json({
        success: true,
        data: {
          totalBadgesAwarded: 8,
          totalAchievementsUnlocked: 5,
          totalManualAwards: 2,
          mostAwardedBadge: { badgeId: "b1", name: "Trendsetter", count: 3 },
        },
      }),
    ),
  );
};

describe("StatsSection", () => {
  it("renders skeleton cards until both stat queries resolve", () => {
    stubStats();

    const { container } = render(<StatsSection />, { wrapper });

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(5);
  });

  it("renders the XP and badge figures once loaded", async () => {
    stubStats();

    const { container } = render(<StatsSection />, { wrapper });

    expect(await screen.findByText("12,500")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Trendsetter")).toBeInTheDocument();
    expect(screen.getByText("3 holders")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(0);
  });

  it("falls back to a dash when no badge has been awarded", async () => {
    mswServer.use(
      http.get(`${API_BASE}/xp/stats`, () =>
        HttpResponse.json({
          success: true,
          data: { totalXpAwarded: 0, usersWithProgress: 0 },
        }),
      ),
      http.get(`${API_BASE}/badges/stats`, () =>
        HttpResponse.json({
          success: true,
          data: {
            totalBadgesAwarded: 0,
            totalAchievementsUnlocked: 0,
            totalManualAwards: 0,
            mostAwardedBadge: null,
          },
        }),
      ),
    );

    render(<StatsSection />, { wrapper });

    expect(await screen.findByText("—")).toBeInTheDocument();
  });

  it("shows zero fallbacks when a stats request fails", async () => {
    mswServer.use(
      http.get(
        `${API_BASE}/xp/stats`,
        () =>
          new HttpResponse(JSON.stringify({ success: false, message: "boom" }), { status: 500 }),
      ),
      http.get(
        `${API_BASE}/badges/stats`,
        () =>
          new HttpResponse(JSON.stringify({ success: false, message: "boom" }), { status: 500 }),
      ),
    );

    const { container } = render(<StatsSection />, { wrapper });

    await waitFor(() => expect(container.querySelectorAll(".animate-pulse")).toHaveLength(0));
    expect(screen.getByText("Total XP awarded")).toBeInTheDocument();
    expect(screen.getAllByText("0").length).toBeGreaterThan(1);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
