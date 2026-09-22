import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarketingCta } from "./MarketingCta";

describe("MarketingCta", () => {
  it("renders the title, body and primary link", () => {
    render(
      <MarketingCta
        title="Apply to list your brand"
        body="Listing is free and takes a few minutes."
        primary={{ href: "/apply", label: "Apply now" }}
      />,
    );

    expect(screen.getByText("Apply to list your brand")).toBeInTheDocument();
    const primaryLink = screen.getByRole("link", { name: /Apply now/ });
    expect(primaryLink).toHaveAttribute("href", "/apply");
  });

  it("renders a secondary link only when given one", () => {
    const { rerender } = render(
      <MarketingCta
        title="Start with a look you like"
        body="Browse creator looks."
        primary={{ href: "/shop", label: "Shop everything" }}
      />,
    );
    expect(screen.queryByRole("link", { name: "Explore looks" })).not.toBeInTheDocument();

    rerender(
      <MarketingCta
        title="Start with a look you like"
        body="Browse creator looks."
        primary={{ href: "/shop", label: "Shop everything" }}
        secondary={{ href: "/explore", label: "Explore looks" }}
      />,
    );
    expect(screen.getByRole("link", { name: "Explore looks" })).toHaveAttribute("href", "/explore");
  });
});
