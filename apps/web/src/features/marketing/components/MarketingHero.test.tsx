import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarketingHero } from "./MarketingHero";

describe("MarketingHero", () => {
  it("renders the eyebrow, heading and lede", () => {
    render(
      <MarketingHero
        eyebrow="For brands"
        title="Get your clothes seen."
        lede="List your brand and reach shoppers across Nepal."
      />,
    );

    expect(screen.getByText("For brands")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Get your clothes seen." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("List your brand and reach shoppers across Nepal."),
    ).toBeInTheDocument();
  });

  it("renders without a lede or children", () => {
    render(<MarketingHero eyebrow="Contact" title="Get in touch" />);

    expect(screen.getByRole("heading", { level: 1, name: "Get in touch" })).toBeInTheDocument();
  });

  it("renders any children passed below the lede", () => {
    render(
      <MarketingHero eyebrow="Contact" title="Get in touch">
        <p>Extra hero content</p>
      </MarketingHero>,
    );

    expect(screen.getByText("Extra hero content")).toBeInTheDocument();
  });
});
