import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartCard } from "./chart-card";

const CHILD_TEXT = "chart-body";

describe("ChartCard", () => {
  it("renders the title and description", () => {
    render(
      <ChartCard title="Earnings" description="Last 30 days">
        <div>{CHILD_TEXT}</div>
      </ChartCard>,
    );

    expect(screen.getByRole("heading", { name: "Earnings" })).toBeInTheDocument();
    expect(screen.getByText("Last 30 days")).toBeInTheDocument();
    expect(screen.getByText(CHILD_TEXT)).toBeInTheDocument();
  });

  it("shows a skeleton and hides the chart while loading", () => {
    const { container } = render(
      <ChartCard title="Earnings" isLoading>
        <div>{CHILD_TEXT}</div>
      </ChartCard>,
    );

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByText(CHILD_TEXT)).not.toBeInTheDocument();
  });

  it("shows the empty message and hides the chart when empty", () => {
    render(
      <ChartCard title="Earnings" isEmpty emptyMessage="No commissions yet">
        <div>{CHILD_TEXT}</div>
      </ChartCard>,
    );

    expect(screen.getByText("No commissions yet")).toBeInTheDocument();
    expect(screen.queryByText(CHILD_TEXT)).not.toBeInTheDocument();
  });

  it("shows an alert and hides the chart on error", () => {
    render(
      <ChartCard title="Earnings" error="Could not load earnings">
        <div>{CHILD_TEXT}</div>
      </ChartCard>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Could not load earnings");
    expect(screen.queryByText(CHILD_TEXT)).not.toBeInTheDocument();
  });

  it("labels the figure and exposes the data table to assistive tech", () => {
    render(
      <ChartCard
        title="Earnings"
        ariaLabel="Earnings per day for the last 30 days"
        dataTable={
          <table>
            <tbody>
              <tr>
                <td>row</td>
              </tr>
            </tbody>
          </table>
        }
      >
        <div>{CHILD_TEXT}</div>
      </ChartCard>,
    );

    expect(
      screen.getByRole("figure", { name: "Earnings per day for the last 30 days" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });
});
