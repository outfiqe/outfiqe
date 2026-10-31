import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Table, type TableColumn } from "./table";

type Row = { id: string; name: string; amount: number };

const rows: Row[] = [
  { id: "1", name: "Alpha", amount: 100 },
  { id: "2", name: "Beta", amount: 200 },
];

const columns: TableColumn<Row>[] = [
  { key: "name", header: "Name", render: (row) => row.name },
  { key: "amount", header: "Amount", render: (row) => row.amount, align: "right" },
];

describe("Table", () => {
  it("calls onRowClick with the clicked row, including from a button inside it", () => {
    const onRowClick = vi.fn();
    render(
      <Table
        columns={[{ key: "name", header: "Name", render: (row: string) => <button>{row}</button> }]}
        rows={["Asha"]}
        rowKey={(row) => row}
        onRowClick={onRowClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Asha" }));

    expect(onRowClick).toHaveBeenCalledExactlyOnceWith("Asha");
  });

  it("renders a header per column and one row per data item", () => {
    render(<Table columns={columns} rows={rows} rowKey={(row) => row.id} />);

    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Amount" })).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
  });

  it("shows the default empty state and no footer when there are no rows", () => {
    render(
      <Table columns={columns} rows={[]} rowKey={(row) => row.id} footer={<tr>should hide</tr>} />,
    );

    expect(screen.getByText("Nothing to show.")).toBeInTheDocument();
    expect(screen.queryByText("should hide")).not.toBeInTheDocument();
  });

  it("shows a custom empty state when provided", () => {
    render(
      <Table
        columns={columns}
        rows={[]}
        rowKey={(row) => row.id}
        emptyState="No orders in this range yet."
      />,
    );

    expect(screen.getByText("No orders in this range yet.")).toBeInTheDocument();
  });

  it("renders the footer once there are rows", () => {
    render(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        footer={
          <tr>
            <td>Total</td>
            <td>300</td>
          </tr>
        }
      />,
    );

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("300")).toBeInTheDocument();
  });

  it("keeps the real headers and shows placeholder rows while loading", () => {
    const { container } = render(
      <Table columns={columns} rows={[]} rowKey={(row) => row.id} isLoading loadingRowCount={3} />,
    );

    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    expect(container.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(screen.queryByText("Nothing to show.")).not.toBeInTheDocument();
  });

  it("hides the footer while loading", () => {
    render(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        isLoading
        footer={
          <tr>
            <td>Totals</td>
          </tr>
        }
      />,
    );

    expect(screen.queryByText("Totals")).not.toBeInTheDocument();
  });

  it("names the table with a caption for screen readers", () => {
    render(
      <Table columns={columns} rows={rows} rowKey={(row) => row.id} caption="Totals by name" />,
    );

    expect(screen.getByRole("table", { name: "Totals by name" })).toBeInTheDocument();
  });

  it("adds a class to the rows the caller picks", () => {
    render(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        rowClassName={(row) => (row.id === "2" ? "is-picked" : undefined)}
      />,
    );

    expect(screen.getByText("Beta").closest("tr")).toHaveClass("is-picked");
    expect(screen.getByText("Alpha").closest("tr")).not.toHaveClass("is-picked");
  });
});
