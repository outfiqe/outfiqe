import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("renders the creator-commission disclosure", () => {
    render(<SiteFooter />);

    expect(
      screen.getByText(/creators may earn a commission when you shop the pieces they've tagged/i),
    ).toBeInTheDocument();
  });

  it("renders the navigation groups", () => {
    render(<SiteFooter />);

    expect(screen.getAllByRole("navigation").length).toBeGreaterThan(0);
  });
});
