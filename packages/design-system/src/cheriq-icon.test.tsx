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

  it("fills the cherries with primary, outlines them in primary-strong and adds a white shine once cheriqed", () => {
    const { container } = render(<CheriqIcon isCheriqed />);

    expect(container.querySelector("svg")).toHaveAttribute("data-cheriqed", "true");
    expect(container.querySelector(".fill-primary")).toHaveClass("stroke-primary-strong");
    expect(container.querySelector(".fill-primary-strong")).toBeInTheDocument();
    expect(container.querySelectorAll(".stroke-white")).toHaveLength(2);
  });

  it("forwards svg props such as sizing classes and animation handlers", () => {
    const { container } = render(<CheriqIcon className="size-5" data-testid="burst" />);

    expect(container.querySelector('[data-testid="burst"]')).toHaveClass("size-5");
  });
});
