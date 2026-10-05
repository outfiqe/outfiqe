import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { FilterMenu } from "./filter-menu";

const PRICE_OPTIONS = [
  { value: "any", label: "Any price" },
  { value: "under-5k", label: "Under Rs 5,000" },
] as const;

const PriceMenu = () => {
  const [priceRange, setPriceRange] = useState<"any" | "under-5k">("any");
  return (
    <FilterMenu
      label="Price"
      options={PRICE_OPTIONS}
      value={priceRange}
      defaultValue="any"
      onChange={setPriceRange}
    />
  );
};

describe("FilterMenu", () => {
  it("shows only its label until something other than the default is picked", () => {
    render(<PriceMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Price" }));
    expect(screen.getByRole("radio", { name: "Any price" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    fireEvent.click(screen.getByRole("radio", { name: "Under Rs 5,000" }));

    expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Price: Under Rs 5,000" })).toBeInTheDocument();
  });

  it("goes back to just its label when the default is picked again", () => {
    render(<PriceMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Price" }));
    fireEvent.click(screen.getByRole("radio", { name: "Under Rs 5,000" }));
    fireEvent.click(screen.getByRole("button", { name: "Price: Under Rs 5,000" }));
    fireEvent.click(screen.getByRole("radio", { name: "Any price" }));

    expect(screen.getByRole("button", { name: "Price" })).toBeInTheDocument();
  });
});
