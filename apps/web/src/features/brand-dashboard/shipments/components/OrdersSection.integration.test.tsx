import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";
import { useFeatureFlagState } from "@/shared/hooks/useFeatureFlag";

import { MISSING_PICKUP_LOCATION_MESSAGE } from "../../pickups/constants/pickupLocationMessages";
import { OrdersSection } from "./OrdersSection";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/shared/hooks/useFeatureFlag", () => ({ useFeatureFlagState: vi.fn() }));
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
  pickupCount: 0,
  incidentRatePercent: 0,
  isNewToPickup: true,
  level: "GOOD",
  incidents: [],
  nextCursor: null,
};

const ORDER_LOGISTICS_OFF = { isEnabled: false, isResolved: true };
const ORDER_LOGISTICS_ON = { isEnabled: true, isResolved: true };
const ORDER_LOGISTICS_LOADING = { isEnabled: false, isResolved: false };

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
    vi.mocked(useFeatureFlagState).mockReturnValue(ORDER_LOGISTICS_OFF);
    renderOrders();

    expect(await screen.findByText(/No sales yet/)).toBeInTheDocument();
    expect(useFeatureFlagState).toHaveBeenCalledWith("order_logistics");
    expect(screen.queryByText(MISSING_PICKUP_LOCATION_MESSAGE)).not.toBeInTheDocument();
    expect(screen.queryByText("Delivery problems")).not.toBeInTheDocument();
    expect(screen.queryByText("Returns coming back to you")).not.toBeInTheDocument();
  });

  it("shows the pickup banner and the returns panel once the switch is on for the brand", async () => {
    vi.mocked(useFeatureFlagState).mockReturnValue(ORDER_LOGISTICS_ON);
    renderOrders();

    expect(await screen.findByText(MISSING_PICKUP_LOCATION_MESSAGE)).toBeInTheDocument();
    expect(await screen.findByText("Returns coming back to you")).toBeInTheDocument();
    expect(screen.queryByText("Delivery problems")).not.toBeInTheDocument();
  });

  it("keeps the returns panel in place while the switches load, so the list below does not jump", async () => {
    vi.mocked(useFeatureFlagState).mockReturnValue(ORDER_LOGISTICS_LOADING);
    renderOrders();

    expect(screen.getByText("Returns coming back to you")).toBeInTheDocument();
    expect(await screen.findByText(/No sales yet/)).toBeInTheDocument();
    expect(screen.queryByText(MISSING_PICKUP_LOCATION_MESSAGE)).not.toBeInTheDocument();
  });

  it("shows delivery problems once the brand has had one", async () => {
    vi.mocked(useFeatureFlagState).mockReturnValue(ORDER_LOGISTICS_ON);
    mswServer.use(
      http.get("/api/logistics/brand/reliability", () =>
        okJson({
          ...quietReliability,
          incidentCount: 1,
          incidents: [
            {
              id: "incident-1",
              kind: "WASTED_VISIT",
              orderId: null,
              note: null,
              occurredAt: "2026-10-16T08:00:00.000Z",
            },
          ],
        }),
      ),
    );
    renderOrders();

    expect(await screen.findByText("Delivery problems")).toBeInTheDocument();
  });
});
