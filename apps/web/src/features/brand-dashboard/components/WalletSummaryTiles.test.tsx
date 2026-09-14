import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BrandPayoutSummary } from "../api/brandPayoutSchemas";
import { WalletSummaryTiles } from "./WalletSummaryTiles";

const summary: BrandPayoutSummary = {
  totalPayouts: 12_000,
  pending: 2_000,
  available: 7_000,
  withdrawn: 3_000,
};

describe("WalletSummaryTiles", () => {
  it("renders every figure once loaded", () => {
    render(<WalletSummaryTiles summary={summary} isLoading={false} isError={false} />);

    expect(screen.getByText("Total sales")).toBeInTheDocument();
    expect(screen.getByText("Rs. 12,000")).toBeInTheDocument();
    expect(screen.getByText("Rs. 2,000")).toBeInTheDocument();
    expect(screen.getByText("Rs. 7,000")).toBeInTheDocument();
    expect(screen.getByText("Rs. 3,000")).toBeInTheDocument();
  });

  it("shows an error banner instead of fabricating zero figures when the summary fails to load", () => {
    render(<WalletSummaryTiles summary={undefined} isLoading={false} isError={true} />);

    expect(
      screen.getByText("We couldn't load your wallet balance right now. Please try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Total sales")).not.toBeInTheDocument();
    expect(screen.queryByText("Rs. 0")).not.toBeInTheDocument();
  });
});
