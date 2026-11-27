import { describe, expect, it } from "vitest";

import {
  describeOrderStatusChange,
  describeRefundDetailsNeeded,
  describeRefundIssued,
} from "./index";

describe("describeOrderStatusChange", () => {
  it("names the order in the stage message", () => {
    expect(
      describeOrderStatusChange({ trackingStage: "PACKED", orderReference: "#A5E730AF" }),
    ).toBe("Order #A5E730AF is packed");
  });

  it("uses the status when there is no stage and appends the order when the copy is not about it", () => {
    expect(describeOrderStatusChange({ status: "SHIPPED", orderReference: "#A5E730AF" })).toBe(
      "Order #A5E730AF was shipped",
    );
    expect(
      describeOrderStatusChange({
        trackingStage: "COLLECTING_ITEMS",
        orderReference: "#A5E730AF",
      }),
    ).toBe("We're collecting your items from the brand (order #A5E730AF)");
  });

  it("falls back to a plain update without a status or reference", () => {
    expect(describeOrderStatusChange({})).toBe("Your order was updated");
  });
});

describe("describeRefundIssued", () => {
  it("describes money returned through the gateway", () => {
    expect(
      describeRefundIssued({
        amount: 850,
        orderReference: "#28A55BF3",
        isTakenOffCashToCollect: false,
      }),
    ).toBe("We've refunded Rs. 850 on order #28A55BF3");
  });

  it("describes a cash order paying less, naming the product", () => {
    expect(
      describeRefundIssued({
        amount: 850,
        orderReference: "#28A55BF3",
        productName: "Linen Shirt",
        isTakenOffCashToCollect: true,
      }),
    ).toBe("You'll pay Rs. 850 less on delivery of Linen Shirt (order #28A55BF3)");
  });

  it("describes a fully cancelled cash order, with and without the reference", () => {
    expect(
      describeRefundIssued({
        orderReference: "#28A55BF3",
        isTakenOffCashToCollect: true,
        emptiesOrder: true,
      }),
    ).toBe("Order #28A55BF3 was cancelled — nothing to pay");
    expect(describeRefundIssued({ isTakenOffCashToCollect: true, emptiesOrder: true })).toBe(
      "Your order was cancelled — nothing to pay",
    );
  });

  it("falls back to your order when the product and reference are missing", () => {
    expect(describeRefundIssued({ amount: 850, isTakenOffCashToCollect: false })).toBe(
      "We've refunded Rs. 850 on your order",
    );
  });
});

describe("describeRefundDetailsNeeded", () => {
  it("asks where to send the refund for the named order", () => {
    expect(describeRefundDetailsNeeded({ amount: 850, orderReference: "#28A55BF3" })).toBe(
      "Tell us where to send your Rs. 850 refund for order #28A55BF3",
    );
  });

  it("falls back to your order", () => {
    expect(describeRefundDetailsNeeded({ amount: 850 })).toBe(
      "Tell us where to send your Rs. 850 refund for your order",
    );
  });
});
