import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RequestStatus } from "../api/withdrawSchemas";
import { WithdrawRequestStatusBadge } from "./WithdrawRequestStatusBadge";

describe("WithdrawRequestStatusBadge", () => {
  it.each([
    [RequestStatus.PENDING, "Pending", "text-amber-800"],
    [RequestStatus.UNDER_REVIEW, "Under review", "text-amber-800"],
    [RequestStatus.APPROVED, "Approved", "text-amber-800"],
    [RequestStatus.PAID, "Paid", "text-green-800"],
    [RequestStatus.REJECTED, "Rejected", "text-red-800"],
  ])("renders %s with the right label and color", (status, label, expectedClass) => {
    render(<WithdrawRequestStatusBadge status={status} />);

    expect(screen.getByText(label)).toHaveClass(expectedClass);
  });
});
