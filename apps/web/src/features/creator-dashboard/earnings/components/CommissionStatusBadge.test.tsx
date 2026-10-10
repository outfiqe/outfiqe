import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CommissionStatus } from "../api/commissionSchemas";
import { CommissionStatusBadge } from "./CommissionStatusBadge";

describe("CommissionStatusBadge", () => {
  it("renders the status text", () => {
    render(<CommissionStatusBadge status={CommissionStatus.PENDING} />);

    expect(screen.getByText("PENDING")).toBeInTheDocument();
  });

  it.each([
    [CommissionStatus.AVAILABLE, "text-green-800"],
    [CommissionStatus.PAID, "text-green-800"],
    [CommissionStatus.PENDING, "text-amber-800"],
    [CommissionStatus.APPROVED, "text-amber-800"],
    [CommissionStatus.VOIDED, "text-red-800"],
  ])("applies the right color class for %s", (status, expectedClass) => {
    render(<CommissionStatusBadge status={status} />);

    expect(screen.getByText(status)).toHaveClass(expectedClass);
  });
});
