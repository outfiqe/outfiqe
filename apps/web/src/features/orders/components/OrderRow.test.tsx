import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NO_REFUND_SUMMARY, type OrderSummary } from "../api/orderSchemas";
import { OrderRow } from "./OrderRow";

const buildOrderSummary = (overrides: Partial<OrderSummary> = {}): OrderSummary => ({
  id: "cb34b663-ef6b-495a-bd6f-cafcbb243ecf",
  createdAt: "2026-09-01T00:00:00.000Z",
  fullName: "Test Buyer",
  paymentMethod: "COD",
  paymentStatus: "DUE",
  fulfilmentStatus: "PLACED",
  fulfilmentSummary: "UNFULFILLED",
  subtotal: 2500,
  deliveryFee: 100,
  codFee: 0,
  platformDiscountTotal: 0,
  total: 2600,
  refundedAmount: 0,
  refundSummary: NO_REFUND_SUMMARY,
  promisedDelivery: null,
  itemCount: 1,
  firstItemImageUrl: null,
  firstItemProductName: "Denim Trucker Jacket",
  ...overrides,
});

describe("OrderRow", () => {
  it("shows a short order reference and links to the full order", () => {
    render(<OrderRow order={buildOrderSummary()} />);

    expect(screen.getByText("#CB34B663")).toBeInTheDocument();
    expect(screen.queryByText("cb34b663-ef6b-495a-bd6f-cafcbb243ecf")).not.toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/orders/cb34b663-ef6b-495a-bd6f-cafcbb243ecf",
    );
  });

  it("labels an unpaid cash-on-delivery order as COD due", () => {
    render(<OrderRow order={buildOrderSummary({ paymentMethod: "COD", paymentStatus: "DUE" })} />);

    expect(screen.getByText("COD due")).toBeInTheDocument();
  });

  it("labels a cancelled unpaid order as having nothing to pay", () => {
    render(
      <OrderRow
        order={buildOrderSummary({
          paymentMethod: "COD",
          paymentStatus: "DUE",
          fulfilmentStatus: "CANCELLED",
        })}
      />,
    );

    expect(screen.getByText("Nothing to pay")).toBeInTheDocument();
    expect(screen.queryByText("COD due")).not.toBeInTheDocument();
  });

  it("shows the raw payment status for a paid order", () => {
    render(
      <OrderRow order={buildOrderSummary({ paymentMethod: "ESEWA", paymentStatus: "PAID" })} />,
    );

    expect(screen.getByText("PAID")).toBeInTheDocument();
  });

  it("shows no refund line when nothing was cancelled", () => {
    render(<OrderRow order={buildOrderSummary()} />);

    expect(screen.queryByText(/cancelled/)).not.toBeInTheDocument();
  });

  it("highlights an order whose refund is waiting for the shopper's details", () => {
    render(
      <OrderRow
        order={buildOrderSummary({
          paymentMethod: "ESEWA",
          paymentStatus: "PAID",
          fulfilmentStatus: "CANCELLED",
          refundSummary: {
            ...NO_REFUND_SUMMARY,
            cancelledUnitCount: 2,
            causes: ["SOLD_OUT_AT_PAYMENT"],
            amountComingBack: 4210,
            amountAwaitingDetails: 4210,
          },
        })}
      />,
    );

    expect(
      screen.getByText("2 items cancelled · Action needed: add refund details"),
    ).toBeInTheDocument();
  });

  it("says a cancelled item is off what a cash-on-delivery shopper pays", () => {
    render(
      <OrderRow
        order={buildOrderSummary({
          refundSummary: {
            ...NO_REFUND_SUMMARY,
            cancelledUnitCount: 1,
            causes: ["CUSTOMER_CANCELLED"],
            amountOffCashPayment: 800,
          },
        })}
      />,
    );

    expect(
      screen.getByText("1 item cancelled · Rs. 800 off what you pay on delivery"),
    ).toBeInTheDocument();
  });

  it("says when a refund is on its way and when it has been paid", () => {
    const { rerender } = render(
      <OrderRow
        order={buildOrderSummary({
          refundSummary: { ...NO_REFUND_SUMMARY, cancelledUnitCount: 1, amountComingBack: 900 },
        })}
      />,
    );
    expect(screen.getByText("1 item cancelled · Rs. 900 refund on its way")).toBeInTheDocument();

    rerender(
      <OrderRow
        order={buildOrderSummary({
          refundSummary: { ...NO_REFUND_SUMMARY, cancelledUnitCount: 1, amountRefunded: 900 },
        })}
      />,
    );
    expect(screen.getByText("1 item cancelled · Rs. 900 refunded")).toBeInTheDocument();
  });

  it("shows a thumbnail and a multi-item summary when there is more than one item", () => {
    render(
      <OrderRow
        order={buildOrderSummary({
          itemCount: 3,
          firstItemImageUrl: "https://cdn.example.com/jacket.jpg",
          firstItemProductName: "Denim Trucker Jacket",
        })}
      />,
    );

    expect(screen.getByText(/Denim Trucker Jacket/)).toBeInTheDocument();
    expect(screen.getByText(/and 2 more/)).toBeInTheDocument();
  });
});
