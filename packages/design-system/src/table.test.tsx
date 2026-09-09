import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
});
