import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FilterChip } from "./filter-chip";

describe("FilterChip", () => {
  it("announces whether it is selected and never submits a form", () => {
    render(
      <>
        <FilterChip isSelected>Kurta</FilterChip>
        <FilterChip isSelected={false}>Saree</FilterChip>
      </>,
    );

    expect(screen.getByRole("button", { name: "Kurta" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Saree" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Kurta" })).toHaveAttribute("type", "button");
  });

  it("calls its click handler unless disabled", () => {
    const selectChip = vi.fn();
    const { rerender } = render(
      <FilterChip isSelected={false} onClick={selectChip}>
        In stock
      </FilterChip>,
    );

    fireEvent.click(screen.getByRole("button", { name: "In stock" }));
    rerender(
      <FilterChip isSelected={false} onClick={selectChip} disabled>
        In stock
      </FilterChip>,
    );
    fireEvent.click(screen.getByRole("button", { name: "In stock" }));

    expect(selectChip).toHaveBeenCalledTimes(1);
  });
});
