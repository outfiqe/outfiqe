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
    expect(screen.getByText("Returns within 7 days if unworn")).toBeInTheDocument();
  });

  it("shows the default-zone delivery estimate once loaded", () => {
    mockZonesQuery({ data: [buildZone()] });

    render(<ShippingInfo />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText(/delivery to/)).toHaveTextContent(
      "Rs. 120 delivery to Kathmandu Valley · Free above Rs. 5,000",
    );
  });

  it("hides the free-delivery note when the zone has no threshold", () => {
    mockZonesQuery({ data: [buildZone({ freeDeliveryThreshold: 0 })] });

    render(<ShippingInfo />);

    expect(screen.getByText(/delivery to/)).toHaveTextContent(
      "Rs. 120 delivery to Kathmandu Valley",
    );
    expect(screen.queryByText(/Free above/)).not.toBeInTheDocument();
  });

  it("omits the delivery line when there is no default zone", () => {
    mockZonesQuery({ data: [buildZone({ isDefault: false })] });

    render(<ShippingInfo />);

    expect(screen.queryByText(/delivery to/)).not.toBeInTheDocument();
    expect(screen.getByText("Returns within 7 days if unworn")).toBeInTheDocument();
  });
});
