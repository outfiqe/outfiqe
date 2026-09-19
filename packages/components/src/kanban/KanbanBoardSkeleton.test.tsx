import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KanbanBoardSkeleton } from "./KanbanBoardSkeleton";

describe("KanbanBoardSkeleton", () => {
  it("draws the requested number of columns with the same width as the real board", () => {
    const { container } = render(<KanbanBoardSkeleton columnCount={3} />);

    const columns = container.querySelectorAll("section");
    expect(columns).toHaveLength(3);
    columns.forEach((column) => {
      expect(column).toHaveClass("w-72", "shrink-0", "rounded-xl", "border", "p-3");
    });
  });

  it("puts placeholder cards with the real card styling in every column", () => {
    const { container } = render(<KanbanBoardSkeleton />);

    const firstColumnCards = container.querySelector("section")?.querySelectorAll("article");
    expect(firstColumnCards?.length).toBeGreaterThan(0);
    expect(firstColumnCards?.[0]).toHaveClass("rounded-lg", "bg-background", "p-3", "shadow-sm");
  });

  it("announces a loading status", () => {
    render(<KanbanBoardSkeleton />);

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
  });
});
