import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";
import { useFeatureFlag } from "@/shared/hooks/useFeatureFlag";

import { MISSING_PICKUP_LOCATION_MESSAGE } from "../../pickups/constants/pickupLocationMessages";
import { OrdersSection } from "./OrdersSection";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/shared/hooks/useFeatureFlag", () => ({ useFeatureFlag: vi.fn() }));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const quietReliability = {
  windowDays: 30,
  incidentCount: 0,
  level: "GOOD",
  warningAt: 3,
  reviewAt: 6,
  incidents: [],
  nextCursor: null,
};

const renderOrders = () => render(<OrdersSection />, { wrapper: createQueryClientWrapper() });

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    state: { user: { role: "BRAND_OWNER" } },
  } as ReturnType<typeof useAuth>);
  mswServer.use(
    http.get("/api/orders/brand/fulfilment-groups", () => okJson({ items: [], nextCursor: null })),
    http.get("/api/logistics/brand/pickup-locations", () => okJson({ pickupLocations: [] })),
    http.get("/api/logistics/brand/reliability", () => okJson(quietReliability)),
    http.get("/api/logistics/brand/returns", () => okJson({ items: [], nextCursor: null })),
  );
});

describe("OrdersSection", () => {
  it("shows no Outfiqe delivery panels to a brand while the switch is off", async () => {
    vi.mocked(useFeatureFlag).mockReturnValue(false);
    renderOrders();

    expect(await screen.findByText(/No sales yet/)).toBeInTheDocument();
    expect(useFeatureFlag).toHaveBeenCalledWith("order_logistics");
    expect(screen.queryByText(MISSING_PICKUP_LOCATION_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText("Delivery reliability")).not.toBeInTheDocument();
    expect(screen.queryByText("Returns coming back to you")).not.toBeInTheDocument();
  });

  it("shows the pickup banner and the delivery panels once the switch is on for the brand", async () => {
    vi.mocked(useFeatureFlag).mockReturnValue(true);
    renderOrders();

    expect(await screen.findByText(MISSING_PICKUP_LOCATION_MESSAGE)).toBeInTheDocument();
    expect(await screen.findByText("Delivery reliability")).toBeInTheDocument();
    expect(await screen.findByText("Returns coming back to you")).toBeInTheDocument();
  });
});
