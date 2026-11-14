import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as DeliveryZonesModule from "@/features/delivery-zones";
import { type DeliveryZone, useDeliveryZones } from "@/features/delivery-zones";

import { ShippingInfo } from "./ShippingInfo";

vi.mock("@/features/delivery-zones", async (importOriginal) => {
  const actual = await importOriginal<typeof DeliveryZonesModule>();
  return { ...actual, useDeliveryZones: vi.fn() };
});

const buildZone = (overrides: Partial<DeliveryZone> = {}): DeliveryZone => ({
  id: "z1",
  name: "Kathmandu Valley",
  isDefault: true,
  cities: ["Kathmandu"],
  standardDeliveryFee: 120,
  freeDeliveryThreshold: 5000,
  codHandlingFee: 0,
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...overrides,
});

const mockZonesQuery = (overrides: Partial<ReturnType<typeof useDeliveryZones>>) => {
  vi.mocked(useDeliveryZones).mockReturnValue({
    data: undefined,
    isLoading: false,
    ...overrides,
  } as ReturnType<typeof useDeliveryZones>);
};

beforeEach(() => {
  mockZonesQuery({ isLoading: true });
});

describe("ShippingInfo", () => {
  it("shows a skeleton line and the returns policy while the zones load", () => {
    mockZonesQuery({ isLoading: true });

    render(<ShippingInfo />);

    expect(screen.getByRole("status", { name: "Loading delivery estimate" })).toBeInTheDocument();
    expect(screen.getByText("Damaged or wrong item? Tell us within 7 days")).toBeInTheDocument();
  });

  it("quotes the cheapest delivery fee without naming any internal zone", () => {
    mockZonesQuery({
      data: [
        buildZone({ name: "Default zone", standardDeliveryFee: 150, cities: [] }),
        buildZone({ id: "z2", isDefault: false, standardDeliveryFee: 120 }),
      ],
    });

    render(<ShippingInfo />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(/Delivery from/)).toHaveTextContent(
      "Delivery from Rs. 120 · Free above Rs. 5,000",
    );
    expect(screen.queryByText(/Default zone|Kathmandu Valley/)).not.toBeInTheDocument();
  });

  it("hides the free-delivery note when there is no threshold", () => {
    mockZonesQuery({ data: [buildZone({ freeDeliveryThreshold: 0 })] });

    render(<ShippingInfo />);

    expect(screen.getByText(/Delivery from/)).toHaveTextContent("Delivery from Rs. 120");
    expect(screen.queryByText(/Free above/)).not.toBeInTheDocument();
  });

  it("omits the delivery line when no delivery zones are set up", () => {
    mockZonesQuery({ data: [] });

    render(<ShippingInfo />);

    expect(screen.queryByText(/Delivery from/)).not.toBeInTheDocument();
    expect(screen.getByText("Damaged or wrong item? Tell us within 7 days")).toBeInTheDocument();
  });
});
