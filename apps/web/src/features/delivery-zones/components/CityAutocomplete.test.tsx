import type * as OutfiqeHooks from "@outfiqe/hooks";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { DeliveryZoneCityMatch } from "../api/deliveryZoneSchemas";
import { CityAutocomplete } from "./CityAutocomplete";

const VALLEY_ZONE = {
  zoneId: "zone-valley",
  zoneName: "Kathmandu Valley",
  isDefault: false,
  standardDeliveryFee: 100,
  freeDeliveryThreshold: 5000,
  codHandlingFee: 50,
};

const LISTED_CITIES: DeliveryZoneCityMatch[] = [
  { ...VALLEY_ZONE, city: "Kathmandu" },
  { ...VALLEY_ZONE, city: "Lalitpur" },
];

vi.mock("@outfiqe/hooks", async (importOriginal) => ({
  ...(await importOriginal<typeof OutfiqeHooks>()),
  useDebouncedValue: <Value,>(value: Value) => value,
}));

vi.mock("../hooks/useCitySearch", () => ({
  useCitySearch: (query: string) => ({
    data: LISTED_CITIES.filter((match) =>
      match.city.toLowerCase().startsWith(query.trim().toLowerCase()),
    ),
    isLoading: false,
  }),
}));

const CityFieldHarness = ({ onCityChange }: { onCityChange: (city: string) => void }) => {
  const [city, setCity] = useState("");
  return (
    <CityAutocomplete
      aria-label="City"
      value={city}
      onChange={(nextCity) => {
        setCity(nextCity);
        onCityChange(nextCity);
      }}
    />
  );
};

const typeCity = (typed: string) => {
  const input = screen.getByLabelText("City");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: typed } });
  return input;
};

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("CityAutocomplete", () => {
  it("lists matching cities under their zone and picks the clicked one", () => {
    const onCityChange = vi.fn();
    render(<CityFieldHarness onCityChange={onCityChange} />);

    typeCity("Kath");
    expect(screen.getByText("Kathmandu Valley")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "Kathmandu" }));

    expect(onCityChange).toHaveBeenCalledWith("Kathmandu");
  });

  it("never offers to use text that matches no listed city", () => {
    const onCityChange = vi.fn();
    render(<CityFieldHarness onCityChange={onCityChange} />);

    typeCity("sfasd");

    expect(screen.queryByText("Not in the list")).not.toBeInTheDocument();
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(onCityChange).not.toHaveBeenCalled();
  });

  it("says Outfiqe doesn't deliver there yet when nothing listed matches", () => {
    render(<CityFieldHarness onCityChange={vi.fn()} />);

    typeCity("Dhulikhel");

    expect(screen.getByText("We don't deliver to this area yet")).toBeInTheDocument();
    expect(screen.queryByText("Keep typing your city")).not.toBeInTheDocument();
  });

  it("does not choose unmatched text when the visitor presses Enter", () => {
    const onCityChange = vi.fn();
    render(<CityFieldHarness onCityChange={onCityChange} />);

    const input = typeCity("Dhulikhel");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onCityChange).not.toHaveBeenCalled();
  });

  it("shows no delivery message while a listed city matches, whatever the letter case", () => {
    render(<CityFieldHarness onCityChange={vi.fn()} />);

    typeCity("lalitpur");

    expect(screen.getByRole("option", { name: "Lalitpur" })).toBeInTheDocument();
    expect(screen.queryByText("We don't deliver to this area yet")).not.toBeInTheDocument();
  });

  it("puts the last chosen city back when the visitor leaves without choosing", () => {
    const onCityChange = vi.fn();
    render(<CityFieldHarness onCityChange={onCityChange} />);

    const input = typeCity("Dhulikhel");
    fireEvent.blur(input);

    expect(onCityChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
  });
});
