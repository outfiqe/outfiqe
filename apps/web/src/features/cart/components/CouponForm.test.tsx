import { ApiClientError } from "@outfiqe/client";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { CouponForm } from "./CouponForm";

const applyMutate = vi.fn();
const removeMutate = vi.fn();

type ApplyCouponMockState = {
  mutate: typeof applyMutate;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
};

const useApplyCouponMock = vi.fn<() => ApplyCouponMockState>(() => ({
  mutate: applyMutate,
  isPending: false,
  isError: false,
  error: null,
}));

vi.mock("../hooks/useApplyCoupon", () => ({
  useApplyCoupon: () => useApplyCouponMock(),
}));
vi.mock("../hooks/useRemoveCoupon", () => ({
  useRemoveCoupon: () => ({ mutate: removeMutate, isPending: false }),
}));

beforeEach(() => {
  applyMutate.mockClear();
  removeMutate.mockClear();
  useApplyCouponMock.mockReturnValue({
    mutate: applyMutate,
    isPending: false,
    isError: false,
    error: null,
  });
});

describe("CouponForm", () => {
  it("submits the trimmed code when applying", async () => {
    render(<CouponForm appliedCoupon={null} />);

    await userEvent.type(screen.getByLabelText("Coupon code"), "  welcome300  ");
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(applyMutate).toHaveBeenCalledWith("welcome300", expect.anything());
  });

  it("disables the apply button when the input is empty", () => {
    render(<CouponForm appliedCoupon={null} />);
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("never calls mutate for a whitespace-only submission", () => {
    render(<CouponForm appliedCoupon={null} />);
    fireEvent.submit(screen.getByRole("button", { name: "Apply" }).closest("form")!);
    expect(applyMutate).not.toHaveBeenCalled();
  });

  it("shows the pending label while a coupon is being applied", () => {
    useApplyCouponMock.mockReturnValue({
      mutate: applyMutate,
      isPending: true,
      isError: false,
      error: null,
    });

    render(<CouponForm appliedCoupon={null} />);

    expect(screen.getByRole("button", { name: "Applying…" })).toBeDisabled();
  });

  it("shows the backend's error message when applying fails", () => {
    useApplyCouponMock.mockReturnValue({
      mutate: applyMutate,
      isPending: false,
      isError: true,
      error: new ApiClientError("You've already used this coupon.", "COUPON_ALREADY_USED"),
    });

    render(<CouponForm appliedCoupon={null} />);

    expect(screen.getByRole("alert")).toHaveTextContent("You've already used this coupon.");
  });

  it("shows the applied coupon with a way to remove it instead of the input", async () => {
    render(
      <CouponForm
        appliedCoupon={{ code: "WELCOME300", discountAmount: 300, prepaidOnly: false }}
      />,
    );

    expect(screen.getByText("WELCOME300 applied")).toBeInTheDocument();
    expect(screen.queryByLabelText("Coupon code")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Remove coupon" }));
    expect(removeMutate).toHaveBeenCalled();
  });
});
