import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WithdrawSectionSkeleton } from "./WithdrawSectionSkeleton";

describe("WithdrawSectionSkeleton", () => {
  it("renders one animated placeholder per block of the real withdraw section", () => {
    const { container } = render(<WithdrawSectionSkeleton />);

    const HEADER = 2;
    const POLICY_PANEL = 1;
    const BANK_ACCOUNTS = 1 + 2;
    const REQUEST_CARD = 1 + 1;
    const HISTORY = 1 + 3;

    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(
      HEADER + POLICY_PANEL + BANK_ACCOUNTS + REQUEST_CARD + HISTORY,
    );
  });
});
