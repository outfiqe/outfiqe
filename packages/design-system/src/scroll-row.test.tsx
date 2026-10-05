import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ScrollRow } from "./scroll-row";

const ROW_WIDTH = 300;
const CONTENT_WIDTH = 900;

const renderOverflowingRow = () => {
  render(
    <ScrollRow
      label="Filter by type"
      scrollBackLabel="Earlier types"
      scrollForwardLabel="More types"
    >
      <button type="button">Tops</button>
      <button type="button">Shoes</button>
    </ScrollRow>,
  );
  const scroller = screen.getByRole("group", { name: "Filter by type" });
  Object.defineProperty(scroller, "clientWidth", { configurable: true, value: ROW_WIDTH });
  Object.defineProperty(scroller, "scrollWidth", { configurable: true, value: CONTENT_WIDTH });
  return scroller;
};

describe("ScrollRow", () => {
  it("shows no arrows while everything fits", () => {
    render(
      <ScrollRow label="Filter by type">
        <button type="button">Tops</button>
      </ScrollRow>,
    );

    expect(screen.getByRole("button", { name: "Tops" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Scroll forward" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Scroll back" })).not.toBeInTheDocument();
  });

  it("offers arrows for whichever side has more, and scrolls when one is pressed", () => {
    const scroller = renderOverflowingRow();
    const scrollBy = vi.fn();
    scroller.scrollBy = scrollBy;

    fireEvent.scroll(scroller);
    expect(screen.queryByRole("button", { name: "Earlier types" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "More types" }));
    expect(scrollBy).toHaveBeenCalledWith({ left: expect.any(Number), behavior: "smooth" });

    scroller.scrollLeft = CONTENT_WIDTH - ROW_WIDTH;
    fireEvent.scroll(scroller);

    expect(screen.getByRole("button", { name: "Earlier types" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More types" })).not.toBeInTheDocument();
  });
});
