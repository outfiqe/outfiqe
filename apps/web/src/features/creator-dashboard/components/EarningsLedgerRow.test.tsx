import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  CommissionSource,
  CommissionStatus,
  type CreatorCommission,
} from "../api/commissionSchemas";
import { EarningsLedgerRow } from "./EarningsLedgerRow";

const buildCommission = (overrides: Partial<CreatorCommission> = {}): CreatorCommission => ({
  id: "commission-1",
  productName: "Denim Jacket",
  brandName: "Studio Nine",
  imageUrl: "https://cdn.outfiqe.test/jacket.jpg",
  source: CommissionSource.TAG_CLICK,
  status: CommissionStatus.PENDING,
  amount: 500,
  createdAt: "2026-01-15T00:00:00.000Z",
  ...overrides,
});

describe("EarningsLedgerRow", () => {
  it("renders the product, brand, and formatted amount", () => {
    render(<EarningsLedgerRow commission={buildCommission()} />);

    expect(screen.getByText("Denim Jacket")).toBeInTheDocument();
    expect(screen.getByText(/Studio Nine/)).toBeInTheDocument();
    expect(screen.getByText("Rs. 500")).toBeInTheDocument();
  });

  it("shows a fallback icon instead of a background image when imageUrl is null", () => {
    const { container } = render(
      <EarningsLedgerRow commission={buildCommission({ imageUrl: null })} />,
    );

    const thumbnail = container.querySelector(".bg-cover");
    expect(thumbnail).toHaveStyle({ backgroundImage: "" });
  });

  it.each([
    [CommissionSource.TAG_CLICK, "via tagged post"],
    [CommissionSource.INTERNAL_LINK, "via your link"],
    [CommissionSource.EXTERNAL_LINK, "via shared link"],
  ])("labels the %s source as %s", (source, label) => {
    render(<EarningsLedgerRow commission={buildCommission({ source })} />);

    expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
  });

  it("renders the commission's status badge", () => {
    render(<EarningsLedgerRow commission={buildCommission({ status: CommissionStatus.PAID })} />);

    expect(screen.getByText("PAID")).toBeInTheDocument();
  });
});
