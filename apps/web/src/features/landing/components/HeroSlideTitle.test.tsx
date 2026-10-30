import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HeroSlideTitle } from "./HeroSlideTitle";

const PAGE_HEADING_LEVEL = 1;
const SECONDARY_HEADING_LEVEL = 2;

describe("HeroSlideTitle", () => {
  it("renders the page heading for the first slide", () => {
    render(<HeroSlideTitle title="Effortless Essentials" isPageHeading />);

    expect(
      screen.getByRole("heading", { level: PAGE_HEADING_LEVEL, name: "Effortless Essentials" }),
    ).toBeInTheDocument();
  });

  it("renders a secondary heading for the other slides", () => {
    render(<HeroSlideTitle title="Retro High Street" isPageHeading={false} />);

    expect(
      screen.getByRole("heading", { level: SECONDARY_HEADING_LEVEL, name: "Retro High Street" }),
    ).toBeInTheDocument();
  });
});
