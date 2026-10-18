import { Toaster } from "@outfiqe/design-system";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import {
  grantEveryPlatformPermission,
  grantOnlyPlatformPermissions,
} from "@test/platformPermissionsMock";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { HubsPage } from "./HubsPage";

const API_BASE = "http://localhost:3000/api";
const HUBS_URL = `${API_BASE}/logistics/admin/hubs`;

const hub = (overrides: Record<string, unknown> = {}) => ({
  id: "hub-1",
  name: "Kathmandu Hub",
  countryCode: "NP",
  address: "Teku Road",
  city: "Kathmandu",
  phone: "+9779812345678",
  timeZone: "Asia/Kathmandu",
  workingDays: [0, 1, 2, 3, 4, 5],
  openTime: "09:00",
  closeTime: "19:00",
  pickupRoundTimes: ["11:00", "15:00"],
  readyCutoffMinutes: 60,
  partnerCollectionTime: "17:30",
  isActive: true,
  pickupZones: [{ id: "zone-1", name: "Kathmandu Valley" }],
  ...overrides,
});

const okJson = (data: unknown, status = 200) =>
  HttpResponse.json({ success: true, message: "ok", data }, { status });

const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
  return render(<HubsPage />, { wrapper });
};

afterEach(() => {
  grantEveryPlatformPermission();
});

describe("HubsPage", () => {
  it("lists hubs with their schedule and pickup areas", async () => {
    mswServer.use(http.get(HUBS_URL, () => okJson({ hubs: [hub()] })));
    renderPage();

    expect(await screen.findByText("Kathmandu Hub")).toBeInTheDocument();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Kathmandu Valley")).toBeInTheDocument();
    expect(
      screen.getByText(/Sun, Mon, Tue, Wed, Thu, Fri · 09:00–19:00 \(Asia\/Kathmandu\)/),
    ).toBeInTheDocument();
  });

  it("shows the empty state when there are no hubs", async () => {
    mswServer.use(http.get(HUBS_URL, () => okJson({ hubs: [] })));
    renderPage();

    expect(await screen.findByText("No hubs yet.")).toBeInTheDocument();
  });

  it("adds a hub from the form", async () => {
    let createdBody: unknown;
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [] })),
      http.post(HUBS_URL, async ({ request }) => {
        createdBody = await request.json();
        return okJson(hub(), 201);
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Add hub" }));
    await user.type(screen.getByLabelText("Hub name"), "Kathmandu Hub");
    await user.type(screen.getByLabelText("Address"), "Teku Road");
    await user.type(screen.getByLabelText("City"), "Kathmandu");
    await user.type(screen.getByLabelText("Phone"), "9812345678");
    await user.click(screen.getByRole("button", { name: "Save hub" }));

    await waitFor(() =>
      expect(createdBody).toEqual({
        name: "Kathmandu Hub",
        countryCode: "NP",
        address: "Teku Road",
        city: "Kathmandu",
        phone: "9812345678",
        timeZone: "Asia/Kathmandu",
        workingDays: [0, 1, 2, 3, 4, 5],
        openTime: "09:00",
        closeTime: "19:00",
        pickupRoundTimes: ["11:00", "15:00"],
        readyCutoffMinutes: 60,
        partnerCollectionTime: "17:30",
        isActive: true,
      }),
    );
    expect(await screen.findByText("Hub added.")).toBeInTheDocument();
  });

  it("saves the pickup areas chosen for a hub", async () => {
    let savedZoneIds: unknown;
    mswServer.use(
      http.get(HUBS_URL, () => okJson({ hubs: [hub({ pickupZones: [] })] })),
      http.get(`${API_BASE}/delivery-zones`, () =>
        okJson([
          {
            id: "zone-1",
            name: "Kathmandu Valley",
            countryCode: "NP",
            isDefault: true,
            cities: ["Kathmandu", "Lalitpur"],
            standardDeliveryFee: 100,
            freeDeliveryThreshold: 3000,
            codHandlingFee: 50,
            minDeliveryDays: 1,
            maxDeliveryDays: 2,
            updatedAt: "2026-09-01T00:00:00.000Z",
          },
        ]),
      ),
      http.put(`${HUBS_URL}/hub-1/pickup-zones`, async ({ request }) => {
        savedZoneIds = await request.json();
        return okJson(hub());
      }),
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Pickup areas" }));
    await user.click(await screen.findByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "Save pickup areas" }));

    await waitFor(() => expect(savedZoneIds).toEqual({ deliveryZoneIds: ["zone-1"] }));
  });

  it("hides the changes for someone who can only view logistics", async () => {
    grantOnlyPlatformPermissions("platform:logistics:read");
    mswServer.use(http.get(HUBS_URL, () => okJson({ hubs: [hub()] })));
    renderPage();

    expect(await screen.findByText("Kathmandu Hub")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add hub" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  });
});
