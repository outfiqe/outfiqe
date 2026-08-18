import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductGridSkeleton } from "@/components/ProductGridSkeleton";

describe("ProductGridSkeleton", () => {
  it("renders 10 skeleton cards by default under an accessible loading status", () => {
    render(<ProductGridSkeleton />);

    const status = screen.getByRole("status", { name: "Loading products" });
    expect(status.children).toHaveLength(10);
  });

  it("renders the requested number of skeleton cards", () => {
    render(<ProductGridSkeleton count={3} />);

    expect(screen.getByRole("status").children).toHaveLength(3);
  });
});
