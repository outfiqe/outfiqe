import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { okJson } from "../../testing/logisticsFixtures";
import { DeliveryRefusalsCard } from "./DeliveryRefusalsCard";

const REFUSALS_URL = "http://localhost:3000/api/logistics/admin/orders/order-1/delivery-refusals";

const blockedCustomer = {
  isCashOnDeliveryAllowed: false,
  refusalCount: 2,
  refusalLimit: 2,
  windowDays: 365,
  refusals: [
    { id: "refusal-1", orderId: "order-1", refusedAt: "2026-10-10T08:00:00.000Z" },
    { id: "refusal-2", orderId: "order-2", refusedAt: "2026-09-10T08:00:00.000Z" },
  ],
};

describe("DeliveryRefusalsCard", () => {
  it("shows that cash on delivery is off and clears refusals with a reason", async () => {
    let clearBody: unknown;
    mswServer.use(
      http.get(REFUSALS_URL, () => okJson(blockedCustomer)),
      http.post(`${REFUSALS_URL}/clear`, async ({ request }) => {
        clearBody = await request.json();
        return okJson({ ...blockedCustomer, isCashOnDeliveryAllowed: true, refusals: [] });
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(
      <>
        <DeliveryRefusalsCard orderId="order-1" />
        <Toaster />
      </>,
      { path: "/orders/order-1" },
    );

    expect(await screen.findByText("Cash on delivery off")).toBeInTheDocument();
    expect(screen.getByText(/2 refused in the last 365 days/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear refusals" }));
    const dialog = await screen.findByRole("dialog");
    await user.type(
      within(dialog).getByLabelText("Why are you clearing them?"),
      "Family emergency",
    );
    await user.click(within(dialog).getByRole("button", { name: "Clear refusals" }));

    await waitFor(() => expect(clearBody).toEqual({ reason: "Family emergency" }));
  });

  it("hides itself for staff who can't see refusals", async () => {
    mswServer.use(
      http.get(REFUSALS_URL, () => HttpResponse.json({ success: false }, { status: 403 })),
    );
    const { container } = renderWithRouter(<DeliveryRefusalsCard orderId="order-1" />, {
      path: "/orders/order-1",
    });

    await waitFor(() => expect(container.querySelector("section")).toBeNull());
  });
});
