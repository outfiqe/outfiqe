import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { OrderItem } from "../api/orderSchemas";
import { OrderPriceBreakdown } from "./OrderPriceBreakdown";

const buildItem = (overrides: Partial<OrderItem>): OrderItem => ({
  id: "item-1",
  productId: "product-1",
  productName: "Denim Trucker Jacket",
  brandName: "Thamel Thrift Co.",
  imageUrl: null,
  sizeLabel: "M",
  qty: 1,
  unitPrice: 2750,
  attributedCreatorName: null,
  refundedQty: 0,
  canCancel: false,
  ...overrides,
});

const twoItems = [
  buildItem({}),
  buildItem({ id: "item-2", productName: "Terry Cloth Robe Jacket", qty: 2, unitPrice: 2900 }),
];

describe("OrderPriceBreakdown", () => {
  it("shows every line with its price and how the total is made up", () => {
    render(
      <OrderPriceBreakdown
        items={twoItems}
        subtotal={8550}
        couponDiscount={0}
        deliveryFee={0}
        codFee={50}
        total={8600}
        isMoneyUntaken={false}
      />,
    );

    const lines = within(screen.getByRole("list", { name: "Items in this order" }));
    expect(lines.getByText("Rs. 2,750")).toBeInTheDocument();
    expect(lines.getByText("Rs. 5,800")).toBeInTheDocument();
    expect(lines.getByText(/× 2/)).toBeInTheDocument();
    expect(screen.getByText("Subtotal").nextElementSibling).toHaveTextContent("Rs. 8,550");
    expect(screen.getByText("Delivery").nextElementSibling).toHaveTextContent("Free");
    expect(screen.getByText("COD handling").nextElementSibling).toHaveTextContent("Rs. 50");
    expect(screen.getByText("Total").nextElementSibling).toHaveTextContent("Rs. 8,600");
    expect(screen.queryByText("Coupon discount")).not.toBeInTheDocument();
  });

  it("shows a paid delivery fee and a coupon discount when there are any", () => {
    render(
      <OrderPriceBreakdown
        items={[buildItem({ unitPrice: 3200 })]}
        subtotal={3200}
        couponDiscount={200}
        deliveryFee={100}
        codFee={0}
        total={3100}
        isMoneyUntaken={false}
      />,
    );

    expect(screen.getByText("Coupon discount").nextElementSibling).toHaveTextContent("− Rs. 200");
    expect(screen.getByText("Delivery").nextElementSibling).toHaveTextContent("Rs. 100");
    expect(screen.queryByText("COD handling")).not.toBeInTheDocument();
  });

  it("says cancelled for unpaid orders and refunded for paid ones", () => {
    const partlyCancelled = [buildItem({ qty: 2, refundedQty: 1 })];
    const { rerender } = render(
      <OrderPriceBreakdown
        items={partlyCancelled}
        subtotal={5500}
        couponDiscount={0}
        deliveryFee={0}
        codFee={0}
        total={5500}
        isMoneyUntaken
      />,
    );
    expect(screen.getByText(/1 cancelled/)).toBeInTheDocument();

    rerender(
      <OrderPriceBreakdown
        items={partlyCancelled}
        subtotal={5500}
        couponDiscount={0}
        deliveryFee={0}
        codFee={0}
        total={5500}
        isMoneyUntaken={false}
      />,
    );
    expect(screen.getByText(/1 refunded/)).toBeInTheDocument();
  });
});
