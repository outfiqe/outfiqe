import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ExploreProduct } from "./ProductCard";
import { ProductRail } from "./ProductRail";

vi.mock("./ProductCard", () => ({
  ProductCard: ({ product }: { product: { name: string } }) => <p>{product.name}</p>,
}));

const EVERYDAY_TEE: ExploreProduct = {
  id: "prod-1",
  brand: "Studio Nine",
  name: "Everyday Tee",
  price: 1500,
  creatorBuyerCount: 0,
  unitsSold: 0,
};

describe("ProductRail", () => {
  it("links to the full list when the rail has products", () => {
    render(
      <ProductRail
        title="New arrivals"
        viewAllHref="/shop?sort=newest"
        products={[EVERYDAY_TEE]}
      />,
    );

    expect(screen.getByText("Everyday Tee")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View all/ })).toHaveAttribute(
      "href",
      "/shop?sort=newest",
    );
  });

  it("shows only the empty message, with no link, when the rail is empty", () => {
    render(
      <ProductRail
        title="New arrivals"
        viewAllHref="/shop?sort=newest"
        viewAllLabel="See More"
        products={[]}
        emptyMessage="No new arrivals this week — check back soon."
      />,
    );

    expect(screen.getByText("No new arrivals this week — check back soon.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
