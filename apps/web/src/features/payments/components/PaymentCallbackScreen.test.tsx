import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PaymentVerifyStatus } from "../api/paymentsSchemas";
import { PaymentCallbackScreen } from "./PaymentCallbackScreen";

const searchParamValues: Record<string, string | null> = {};
const verifyResult = {
  data: undefined as { status: string } | undefined,
  isError: false,
  hasTimedOut: false,
};
const retryMutate = vi.fn();

vi.mock("next/navigation", () => ({
  useSearchParams: () => ({ get: (key: string) => searchParamValues[key] ?? null }),
}));

vi.mock("../hooks/useVerifyPayment", () => ({
  useVerifyPayment: () => verifyResult,
}));

vi.mock("../hooks/useInitiatePayment", () => ({
  useInitiatePayment: () => ({ mutate: retryMutate, isPending: false }),
}));

const setSearchParams = (params: Record<string, string>) => {
  for (const key of Object.keys(searchParamValues)) delete searchParamValues[key];
  Object.assign(searchParamValues, params);
};

afterEach(() => {
  setSearchParams({});
  verifyResult.data = undefined;
  verifyResult.isError = false;
  verifyResult.hasTimedOut = false;
  retryMutate.mockReset();
});

describe("PaymentCallbackScreen", () => {
  it("asks the shopper to head to their orders when no order id is present", () => {
    render(<PaymentCallbackScreen />);

    expect(screen.getByRole("heading", { name: /something's missing/i })).toBeInTheDocument();
  });

  it("shows the confirming state while verification is still pending", () => {
    setSearchParams({ orderId: "order-1" });
    verifyResult.data = { status: PaymentVerifyStatus.PENDING };

    render(<PaymentCallbackScreen />);

    expect(screen.getByRole("heading", { name: /confirming your payment/i })).toBeInTheDocument();
  });

  it("shows the failed state immediately when the gateway redirected to its failure url", () => {
    setSearchParams({ orderId: "order-1", redirectOutcome: "failed" });
    verifyResult.data = { status: PaymentVerifyStatus.PENDING };

    render(<PaymentCallbackScreen />);

    expect(screen.getByRole("heading", { name: /payment didn't go through/i })).toBeInTheDocument();
  });

  it("still shows success when verification confirms the payment despite a failure redirect", () => {
    setSearchParams({ orderId: "order-1", redirectOutcome: "failed" });
    verifyResult.data = { status: PaymentVerifyStatus.COMPLETE };

    render(<PaymentCallbackScreen />);

    expect(screen.getByRole("heading", { name: /payment received/i })).toBeInTheDocument();
  });

  it("shows the failed state when verification resolves to FAILED", () => {
    setSearchParams({ orderId: "order-1" });
    verifyResult.data = { status: PaymentVerifyStatus.FAILED };

    render(<PaymentCallbackScreen />);

    expect(screen.getByRole("heading", { name: /payment didn't go through/i })).toBeInTheDocument();
  });

  it("shows the failed state when verification itself errors", () => {
    setSearchParams({ orderId: "order-1" });
    verifyResult.isError = true;

    render(<PaymentCallbackScreen />);

    expect(screen.getByRole("heading", { name: /payment didn't go through/i })).toBeInTheDocument();
  });

  it("falls back to the still-confirming state once polling has timed out", () => {
    setSearchParams({ orderId: "order-1" });
    verifyResult.data = { status: PaymentVerifyStatus.PENDING };
    verifyResult.hasTimedOut = true;

    render(<PaymentCallbackScreen />);

    expect(screen.getByRole("heading", { name: /still confirming/i })).toBeInTheDocument();
  });

  it("retries payment for the current order when Try again is clicked", async () => {
    const user = userEvent.setup();
    setSearchParams({ orderId: "order-1", redirectOutcome: "failed" });
    verifyResult.data = { status: PaymentVerifyStatus.PENDING };

    render(<PaymentCallbackScreen />);
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(retryMutate).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
