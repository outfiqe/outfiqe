import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductSearchBox } from "./ProductSearchBox";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

vi.mock("@/features/products/hooks/useProductAutocomplete", () => ({
  useProductAutocomplete: () => ({ data: [], isLoading: false }),
}));

describe("ProductSearchBox", () => {
  it("is a named search landmark with a labelled field", () => {
    render(<ProductSearchBox placeholder="Search fashion, brands & categories" formClassName="" />);

    expect(screen.getByRole("search")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Search products, brands and categories" }),
    ).toBeInTheDocument();
  });
});
