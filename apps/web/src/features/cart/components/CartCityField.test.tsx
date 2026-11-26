import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Address } from "@/features/addresses";
import type * as DeliveryZonesFeature from "@/features/delivery-zones";
import type { DeliveryZone } from "@/features/delivery-zones";

import { CartCityField } from "./CartCityField";

const VALLEY_ZONE: DeliveryZone = {
  id: "zone-valley",
  name: "Kathmandu Valley",
  isDefault: false,
  cities: ["Kathmandu"],
  standardDeliveryFee: 100,
  freeDeliveryThreshold: 5000,
  codHandlingFee: 50,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const buildAddress = (overrides: Partial<Address>): Address => ({
  id: "address-1",
  label: "Home",
  fullName: "Sita Rai",
  phone: "9800000000",
  address: "Baluwatar",
  city: "Kathmandu",
  landmark: null,
  isDefault: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const mocks = vi.hoisted(() => ({
  saveCartCity: vi.fn(),
  savedAddresses: undefined as unknown,
}));

vi.mock("@/features/addresses", () => ({ useAddresses: () => ({ data: mocks.savedAddresses }) }));

vi.mock("@/features/delivery-zones", async (importOriginal) => ({
  ...(await importOriginal<typeof DeliveryZonesFeature>()),
  CityAutocomplete: ({ value }: { value: string }) => (
    <input aria-label="City" value={value} readOnly />
  ),
  useDeliveryZones: () => ({ data: [VALLEY_ZONE] }),
}));

vi.mock("../hooks/useUpdateCartCity", () => ({
  useUpdateCartCity: () => ({ mutate: mocks.saveCartCity, isPending: false }),
}));

beforeEach(() => {
  mocks.saveCartCity.mockClear();
  mocks.savedAddresses = undefined;
});

describe("CartCityField", () => {
  it("fills the bag city from the default saved address when the bag has none", () => {
    mocks.savedAddresses = [buildAddress({})];
    render(<CartCityField city={null} />);

    expect(mocks.saveCartCity).toHaveBeenCalledExactlyOnceWith("Kathmandu");
  });

  it("leaves a city the shopper already chose alone", () => {
    mocks.savedAddresses = [buildAddress({ city: "Kathmandu" })];
    render(<CartCityField city="Kathmandu" />);

    expect(mocks.saveCartCity).not.toHaveBeenCalled();
  });

  it("does not fill a city no zone lists", () => {
    mocks.savedAddresses = [buildAddress({ city: "sfasd" })];
    render(<CartCityField city={null} />);

    expect(mocks.saveCartCity).not.toHaveBeenCalled();
  });

  it("does not fill from an address that is not the default", () => {
    mocks.savedAddresses = [buildAddress({ isDefault: false })];
    render(<CartCityField city={null} />);

    expect(mocks.saveCartCity).not.toHaveBeenCalled();
  });

  it("previews the delivery fee once the bag has a city", () => {
    render(<CartCityField city="Kathmandu" />);

    expect(screen.getByText(/Rs\. 100 delivery/)).toBeInTheDocument();
  });
});
