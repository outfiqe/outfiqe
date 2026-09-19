import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TableSkeleton } from "./TableSkeleton";

describe("TableSkeleton", () => {
  it("renders the real column headers with the requested number of placeholder rows", () => {
    const { container } = render(
      <TableSkeleton headers={["Name", "Company", "Stage"]} rowCount={4} />,
    );

    expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
    expect(within(container).getByText("Company")).toBeInTheDocument();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(4);
  });

  it("gives every cell in a row a placeholder, and an action-shaped one under a blank header", () => {
    const { container } = render(<TableSkeleton headers={["Name", ""]} rowCount={1} />);

    const cells = container.querySelectorAll("tbody td");
    expect(cells).toHaveLength(2);
    expect(cells[1]?.querySelector("button")).not.toBeNull();
  });

  it("drops the right padding on the last column exactly like the real table", () => {
    const { container } = render(
      <TableSkeleton headers={["Shopper", "Last order"]} rowCount={1} />,
    );

    const headerCells = container.querySelectorAll("thead th");
    expect(headerCells[0]).toHaveClass("pr-4");
    expect(headerCells[1]).not.toHaveClass("pr-4");
  });
});
