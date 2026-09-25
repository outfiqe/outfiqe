import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Reveal } from "./Reveal";

describe("Reveal", () => {
  it("renders its children as the given element, content visible in the DOM before any animation runs", () => {
    render(
      <Reveal as="h1" className="headline">
        Get your clothes seen.
      </Reveal>,
    );

    const heading = screen.getByRole("heading", { level: 1, name: "Get your clothes seen." });
    expect(heading).toHaveClass("headline");
  });

  it("defaults to a div wrapper", () => {
    render(<Reveal>Plain content</Reveal>);

    expect(screen.getByText("Plain content").tagName).toBe("DIV");
  });
});
