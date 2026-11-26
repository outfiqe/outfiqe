import { renderWithRouter } from "@test/renderWithRouter";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { OrderItem } from "../../api/ordersSchemas";
import { RefundItemsModal } from "./RefundItemsModal";

const buildItem = (overrides: Partial<OrderItem>): OrderItem => ({
  id: "item-1",
  productId: "product-1",
  productName: "Linen Shirt",
  brandName: "Aurora Label",
  imageUrl: null,
  sizeLabel: "M",
  qty: 3,
  refundedQty: 0,
  unitPrice: 1200,
  attributedCreatorName: null,
  ...overrides,
});

const renderModal = (items: OrderItem[]) =>
  renderWithRouter(<RefundItemsModal orderId="order-1" items={items} onClose={vi.fn()} />, {
    path: "/orders/order-1",
  });

describe("RefundItemsModal", () => {
  it("labels each line's unit picker and words the options in plain language", async () => {
    renderModal([
      buildItem({}),
      buildItem({ id: "item-2", productName: "Wool Scarf", sizeLabel: "OS", qty: 1 }),
    ]);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getAllByText("Units to refund")).toHaveLength(2);
    const shirtUnits = within(dialog).getByRole("combobox", { name: /Linen Shirt/ });
    expect(
      Array.from(shirtUnits.querySelectorAll("option"), (option) => option.textContent),
    ).toEqual(["Don't refund", "1 of 3", "2 of 3", "3 of 3"]);
    expect(within(dialog).getByRole("combobox", { name: /Wool Scarf/ })).toBeInTheDocument();
  });

  it("shows each chosen line's amount and a running total", async () => {
    const user = userEvent.setup();
    renderModal([
      buildItem({}),
      buildItem({ id: "item-2", productName: "Wool Scarf", sizeLabel: "OS", unitPrice: 500 }),
    ]);

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Items to refund: Rs. 0")).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByRole("combobox", { name: /Linen Shirt/ }), "2");
    await user.selectOptions(within(dialog).getByRole("combobox", { name: /Wool Scarf/ }), "1");

    expect(within(dialog).getByText("Rs. 2,400")).toBeInTheDocument();
    expect(within(dialog).getByText("Rs. 500")).toBeInTheDocument();
    expect(within(dialog).getByText("Items to refund: Rs. 2,900")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Delivery and cash-on-delivery fees come back only/),
    ).toBeInTheDocument();
  });

  it("explains what putting units back on sale does", async () => {
    renderModal([buildItem({})]);

    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByLabelText("Put these units back on sale"),
    ).toHaveAccessibleDescription(/Adds the refunded units back to the product's stock/);
  });

  it("only offers units that are not already refunded", async () => {
    renderModal([buildItem({ refundedQty: 2 })]);

    const dialog = await screen.findByRole("dialog");
    const shirtUnits = within(dialog).getByRole("combobox", { name: /Linen Shirt/ });

    expect(
      Array.from(shirtUnits.querySelectorAll("option"), (option) => option.textContent),
    ).toEqual(["Don't refund", "1 of 1"]);
  });

  it("says so when every item is already refunded", async () => {
    renderModal([buildItem({ refundedQty: 3 })]);

    expect(
      await screen.findByText("Every item on this order is already refunded."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Items to refund/)).not.toBeInTheDocument();
  });
});
