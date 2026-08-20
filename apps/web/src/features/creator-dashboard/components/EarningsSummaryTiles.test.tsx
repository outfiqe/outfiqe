import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { EarningsSummary } from "../api/commissionSchemas";
import { EarningsSummaryTiles } from "./EarningsSummaryTiles";

const summary: EarningsSummary = {
  totalEarnings: 12000,
  pending: 3000,
  available: 5000,
  paid: 4000,
};

describe("EarningsSummaryTiles", () => {
  it("renders every tile label", () => {
    render(<EarningsSummaryTiles summary={summary} isLoading={false} />);

    expect(screen.getByText("Total earnings")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Paid")).toBeInTheDocument();
  });

  it("formats each amount with the Rs. prefix and thousands separators", () => {
    render(<EarningsSummaryTiles summary={summary} isLoading={false} />);

    expect(screen.getByText("Rs. 12,000")).toBeInTheDocument();
    expect(screen.getByText("Rs. 3,000")).toBeInTheDocument();
    expect(screen.getByText("Rs. 5,000")).toBeInTheDocument();
    expect(screen.getByText("Rs. 4,000")).toBeInTheDocument();
  });

  it("falls back to zero for a missing field", () => {
    render(
      <EarningsSummaryTiles
        summary={{ totalEarnings: 0, pending: 0, available: 0, paid: 0 }}
        isLoading={false}
      />,
    );

    expect(screen.getAllByText("Rs. 0")).toHaveLength(4);
  });

  it("shows skeleton placeholders instead of amounts while loading", () => {
    render(<EarningsSummaryTiles summary={undefined} isLoading />);

    expect(screen.queryByText(/Rs\./)).not.toBeInTheDocument();
  });
});
