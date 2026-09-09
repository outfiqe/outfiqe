import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BrandProfileViewSkeleton } from "./BrandProfileViewSkeleton";

describe("BrandProfileViewSkeleton", () => {
  it("renders an accessible loading status shaped like the brand profile card", () => {
    const { container } = render(<BrandProfileViewSkeleton />);

    expect(screen.getByRole("status", { name: "Loading profile" })).toBeInTheDocument();
    expect(container.querySelector(".rounded-2xl.border")).toBeInTheDocument();
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(4);
  });
});
