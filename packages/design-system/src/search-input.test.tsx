import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SearchInput } from "./search-input";

describe("SearchInput", () => {
  it("reports what was typed", () => {
    const onValueChange = vi.fn();
    render(<SearchInput value="" onValueChange={onValueChange} placeholder="Search orders" />);

    fireEvent.change(screen.getByLabelText("Search orders"), { target: { value: "coat" } });

    expect(onValueChange).toHaveBeenCalledWith("coat");
  });

  it("only offers to clear when there is something to clear", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <SearchInput value="" onValueChange={onValueChange} placeholder="Search orders" />,
    );
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();

    rerender(
      <SearchInput value="coat" onValueChange={onValueChange} placeholder="Search orders" />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));

    expect(onValueChange).toHaveBeenCalledWith("");
  });
});
