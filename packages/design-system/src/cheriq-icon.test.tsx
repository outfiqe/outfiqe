import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CheriqIcon } from "./cheriq-icon";

describe("CheriqIcon", () => {
  it("renders a decorative, unfilled cherry outline in the current text color when idle", () => {
    const { container } = render(<CheriqIcon />);
    const svg = container.querySelector("svg");

    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("stroke", "currentColor");
    expect(svg).toHaveAttribute("data-cheriqed", "false");
    expect(container.querySelector(".fill-primary")).not.toBeInTheDocument();
  });

  it("fills the cherries and leaf with primary and keeps a white shine once cheriqed", () => {
    const { container } = render(<CheriqIcon isCheriqed />);
    const filledParts = container.querySelectorAll(".fill-primary");

    expect(container.querySelector("svg")).toHaveAttribute("data-cheriqed", "true");
    expect(filledParts).toHaveLength(2);
    filledParts.forEach((part) => expect(part).toHaveClass("stroke-primary"));
    expect(container.querySelectorAll(".stroke-white")).toHaveLength(1);
  });

  it("forwards svg props such as sizing classes and animation handlers", () => {
    const { container } = render(<CheriqIcon className="size-5" data-testid="burst" />);

    expect(container.querySelector('[data-testid="burst"]')).toHaveClass("size-5");
  });
});
