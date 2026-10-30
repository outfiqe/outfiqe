import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PaymentVerifyStatus } from "../api/paymentsSchemas";
import { PaymentCallbackScreen } from "./PaymentCallbackScreen";

const verifyResult = {
  data: undefined as { status: string } | undefined,
  isError: false,
  hasTimedOut: false,
};
const retryMutate = vi.fn();
const trackEvent = vi.fn();

vi.mock("@/features/analytics/utils/analyticsClient", () => ({
  trackEvent: (...trackedEvent: unknown[]) => trackEvent(...trackedEvent),
}));

vi.mock("../hooks/useVerifyPayment", () => ({
  useVerifyPayment: () => verifyResult,
}));

vi.mock("../hooks/useInitiatePayment", () => ({
  useInitiatePayment: () => ({ mutate: retryMutate, isPending: false }),
}));

afterEach(() => {
  verifyResult.data = undefined;
  verifyResult.isError = false;
  verifyResult.hasTimedOut = false;
  retryMutate.mockReset();
  trackEvent.mockReset();
});

describe("PaymentCallbackScreen", () => {
  it("records one payment failure with the order and gateway", () => {
    verifyResult.data = { status: PaymentVerifyStatus.FAILED };

    const { rerender } = render(
      <PaymentCallbackScreen orderId="order-1" paymentProvider="khalti" />,
    );
    rerender(<PaymentCallbackScreen orderId="order-1" paymentProvider="khalti" />);

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.PAYMENT_FAIL, {
      order_id: "order-1",
      payment_method: "khalti",
    });
  });

  it("records no failure when the payment succeeded", () => {
    verifyResult.data = { status: PaymentVerifyStatus.COMPLETE };

    render(<PaymentCallbackScreen orderId="order-1" paymentProvider="esewa" />);

    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("shows the confirming state while verification is still pending", () => {
    verifyResult.data = { status: PaymentVerifyStatus.PENDING };

    render(<PaymentCallbackScreen orderId="order-1" paymentProvider="esewa" />);

    expect(screen.getByRole("heading", { name: /confirming your payment/i })).toBeInTheDocument();
  });

  it("shows the failed state immediately when the gateway redirected to its failure route", () => {
    verifyResult.data = { status: PaymentVerifyStatus.PENDING };

    render(
      <PaymentCallbackScreen orderId="order-1" paymentProvider="esewa" gatewayReportedFailure />,
    );

    expect(screen.getByRole("heading", { name: /payment didn't go through/i })).toBeInTheDocument();
  });

  it("still shows success when verification confirms the payment despite a failure redirect", () => {
    verifyResult.data = { status: PaymentVerifyStatus.COMPLETE };

    render(
      <PaymentCallbackScreen orderId="order-1" paymentProvider="esewa" gatewayReportedFailure />,
    );

    expect(screen.getByRole("heading", { name: /payment received/i })).toBeInTheDocument();
  });

  it("shows the failed state when verification resolves to FAILED", () => {
    verifyResult.data = { status: PaymentVerifyStatus.FAILED };

    render(<PaymentCallbackScreen orderId="order-1" paymentProvider="esewa" />);

    expect(screen.getByRole("heading", { name: /payment didn't go through/i })).toBeInTheDocument();
  });

  it("shows the failed state when verification itself errors", () => {
    verifyResult.isError = true;

    render(<PaymentCallbackScreen orderId="order-1" paymentProvider="esewa" />);

    expect(screen.getByRole("heading", { name: /payment didn't go through/i })).toBeInTheDocument();
  });

  it("falls back to the still-confirming state once polling has timed out", () => {
    verifyResult.data = { status: PaymentVerifyStatus.PENDING };
    verifyResult.hasTimedOut = true;

    render(<PaymentCallbackScreen orderId="order-1" paymentProvider="esewa" />);

    expect(screen.getByRole("heading", { name: /still confirming/i })).toBeInTheDocument();
  });

  it("retries payment for the current order when Try again is clicked", async () => {
    const user = userEvent.setup();
    verifyResult.data = { status: PaymentVerifyStatus.PENDING };

    render(
      <PaymentCallbackScreen orderId="order-1" paymentProvider="esewa" gatewayReportedFailure />,
    );
    await user.click(screen.getByRole("button", { name: /try again/i }));

    expect(retryMutate).toHaveBeenCalledWith(
      "order-1",
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
