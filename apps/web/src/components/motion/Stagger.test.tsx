import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Stagger, StaggerItem } from "./Stagger";

describe("Stagger", () => {
  it("renders as a semantic list when asked, with each item visible in the DOM", () => {
    render(
      <Stagger as="ul">
        <StaggerItem as="li">Free to list</StaggerItem>
        <StaggerItem as="li">We do the setup</StaggerItem>
      </Stagger>,
    );

    const list = screen.getByRole("list");
    expect(list.tagName).toBe("UL");
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Free to list");
  });

  it("defaults both the container and its items to a div", () => {
    render(
      <Stagger>
        <StaggerItem>Item one</StaggerItem>
      </Stagger>,
    );

    expect(screen.getByText("Item one").tagName).toBe("DIV");
  });
});
