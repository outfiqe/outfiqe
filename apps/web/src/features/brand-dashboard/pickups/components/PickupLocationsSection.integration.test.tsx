import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import { MissingPickupLocationBanner } from "./MissingPickupLocationBanner";
import { PickupLocationsSection } from "./PickupLocationsSection";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));

vi.mock("@/features/delivery-zones", () => ({
  CityAutocomplete: ({ value, onChange }: { value: string; onChange: (city: string) => void }) => (
    <input aria-label="City" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

const PICKUP_LOCATIONS_PATH = "/api/logistics/brand/pickup-locations";

const okJson = (data: unknown, status = 200) =>
  HttpResponse.json({ success: true, message: "ok", data }, { status });

const pickupLocation = (overrides: Record<string, unknown> = {}) => ({
  id: "location-1",
  label: "Studio",
  contactName: "Studio Manager",
  contactPhone: "+9779812345678",
  address: "Jhamsikhel Road",
  landmark: null,
  city: "Lalitpur",
  countryCode: "NP",
  latitude: null,
  longitude: null,
  openingNote: null,
  isDefault: true,
  isCoveredByOutfiqePickup: true,
  ...overrides,
});

const renderWithQueryClient = (ui: ReactNode) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const stubPickupLocations = (pickupLocations: ReturnType<typeof pickupLocation>[]) =>
  mswServer.use(http.get(PICKUP_LOCATIONS_PATH, () => okJson({ pickupLocations })));

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue({
    isAuthenticated: true,
    state: { user: { role: "BRAND_OWNER" } },
  } as ReturnType<typeof useAuth>);
});

describe("PickupLocationsSection", () => {
  it("shows the empty state before any location is added", async () => {
    stubPickupLocations([]);
    renderWithQueryClient(<PickupLocationsSection />);

    expect(
      await screen.findByText(
        /No pickup location yet\. Add the address where you hand over parcels\./,
      ),
    ).toBeInTheDocument();
  });

  it("says whether Outfiqe collects from each location", async () => {
    stubPickupLocations([
      pickupLocation(),
      pickupLocation({
        id: "location-2",
        label: "Pokhara shop",
        city: "Pokhara",
        isDefault: false,
        isCoveredByOutfiqePickup: false,
      }),
    ]);
    renderWithQueryClient(<PickupLocationsSection />);

    expect(await screen.findByText("Outfiqe pickup")).toBeInTheDocument();
    expect(screen.getByText("You ship")).toBeInTheDocument();
    expect(screen.getByText("Outfiqe collects your orders from here.")).toBeInTheDocument();
  });

  it("adds a location with the details typed in", async () => {
    stubPickupLocations([]);
    let createdBody: unknown;
    mswServer.use(
      http.post(PICKUP_LOCATIONS_PATH, async ({ request }) => {
        createdBody = await request.json();
        return okJson(pickupLocation(), 201);
      }),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<PickupLocationsSection />);

    await user.click(await screen.findByRole("button", { name: "Add location" }));
    await user.type(screen.getByLabelText("Location name"), "Studio");
    await user.type(screen.getByLabelText("Contact person"), "Studio Manager");
    await user.type(screen.getByLabelText("Contact phone"), "9812345678");
    await user.type(screen.getByLabelText("Address"), "Jhamsikhel Road");
    await user.type(screen.getByLabelText("City"), "Lalitpur");
    await user.type(screen.getByLabelText("Map pin (optional)"), "27.6766, 85.3132");
    await user.click(screen.getByRole("button", { name: "Save location" }));

    await waitFor(() =>
      expect(createdBody).toEqual({
        label: "Studio",
        contactName: "Studio Manager",
        contactPhone: "9812345678",
        address: "Jhamsikhel Road",
        city: "Lalitpur",
        landmark: null,
        openingNote: null,
        latitude: 27.6766,
        longitude: 85.3132,
      }),
    );
  });

  it("shows the server's reason when saving fails", async () => {
    stubPickupLocations([]);
    mswServer.use(
      http.post(PICKUP_LOCATIONS_PATH, () =>
        HttpResponse.json(
          { success: false, message: "That contact phone number isn't valid." },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWithQueryClient(<PickupLocationsSection />);

    await user.click(await screen.findByRole("button", { name: "Add location" }));
    await user.type(screen.getByLabelText("Location name"), "Studio");
    await user.type(screen.getByLabelText("Contact person"), "Studio Manager");
    await user.type(screen.getByLabelText("Contact phone"), "123456");
    await user.type(screen.getByLabelText("Address"), "Jhamsikhel Road");
    await user.type(screen.getByLabelText("City"), "Lalitpur");
    await user.click(screen.getByRole("button", { name: "Save location" }));

    expect(await screen.findByText("That contact phone number isn't valid.")).toBeInTheDocument();
  });

  it("explains the problem when the locations can't be loaded", async () => {
    mswServer.use(
      http.get(PICKUP_LOCATIONS_PATH, () =>
        HttpResponse.json({ success: false, message: "Server error" }, { status: 500 }),
      ),
    );
    renderWithQueryClient(<PickupLocationsSection />);

    expect(
      await screen.findByText(/We couldn't load your pickup locations right now/),
    ).toBeInTheDocument();
  });
});

describe("MissingPickupLocationBanner", () => {
  it("asks the brand to add a pickup location when it has none", async () => {
    stubPickupLocations([]);
    renderWithQueryClient(<MissingPickupLocationBanner />);

    expect(await screen.findByRole("link", { name: "Add pickup location" })).toHaveAttribute(
      "href",
      "/pickup-locations",
    );
  });

  it("stays hidden once a location exists", async () => {
    stubPickupLocations([pickupLocation()]);
    renderWithQueryClient(<MissingPickupLocationBanner />);

    await waitFor(() =>
      expect(screen.queryByRole("link", { name: "Add pickup location" })).not.toBeInTheDocument(),
    );
  });
});
