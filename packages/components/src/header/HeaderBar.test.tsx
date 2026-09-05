import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { stubElementHeight, triggerResizeObservers, waitForAnimationFrame } from "../testing/setup";
import { HeaderBar } from "./HeaderBar";
import {
  barCondensedClass,
  barExpandedClass,
  wrapCondensedClass,
  wrapExpandedClass,
} from "./styles";

const firstClassOf = (classNames: string): string => classNames.split(" ")[0];

describe("HeaderBar", () => {
  it("renders its children inside a banner landmark", () => {
    render(<HeaderBar>Site nav</HeaderBar>);

    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("Site nav")).toBeInTheDocument();
  });

  it("uses the expanded classes by default", () => {
    render(<HeaderBar>Site nav</HeaderBar>);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass(firstClassOf(wrapExpandedClass));
    expect(header.firstElementChild).toHaveClass(firstClassOf(barExpandedClass));
  });

  it("uses the condensed classes when condensed", () => {
    render(<HeaderBar condensed>Site nav</HeaderBar>);

    const header = screen.getByRole("banner");
    expect(header).toHaveClass(firstClassOf(wrapCondensedClass));
    expect(header.firstElementChild).toHaveClass(firstClassOf(barCondensedClass));
    expect(header.firstElementChild).not.toHaveClass(firstClassOf(barExpandedClass));
  });

  it("animates the condense change with a CSS transition rather than a library", () => {
    render(<HeaderBar>Site nav</HeaderBar>);

    const bar = screen.getByRole("banner").firstElementChild;
    expect(bar).toHaveClass(
      "transition-[max-width,padding,background-color,border-color,box-shadow]",
    );
    expect(bar).toHaveClass("motion-reduce:transition-none");
  });

  it("merges a caller className onto the bar", () => {
    render(<HeaderBar className="custom-bar">Site nav</HeaderBar>);

    expect(screen.getByRole("banner").firstElementChild).toHaveClass("custom-bar");
  });

  it("publishes the measured header height to the CSS custom property", async () => {
    const HEADER_HEIGHT_PX = 72;
    stubElementHeight(HEADER_HEIGHT_PX);

    render(<HeaderBar>Site nav</HeaderBar>);
    triggerResizeObservers();
    await waitForAnimationFrame();

    expect(document.documentElement.style.getPropertyValue("--site-header-height")).toBe(
      `${HEADER_HEIGHT_PX}px`,
    );
  });

  it("does not rewrite the custom property when the height is unchanged", async () => {
    stubElementHeight(64);
    render(<HeaderBar>Site nav</HeaderBar>);

    triggerResizeObservers();
    await waitForAnimationFrame();
    document.documentElement.style.removeProperty("--site-header-height");

    triggerResizeObservers();
    await waitForAnimationFrame();

    expect(document.documentElement.style.getPropertyValue("--site-header-height")).toBe("");
  });
});
