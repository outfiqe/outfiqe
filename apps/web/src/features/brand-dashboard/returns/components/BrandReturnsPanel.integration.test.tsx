import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { BrandReturnsPanel } from "./BrandReturnsPanel";

const BRAND_RETURNS_URL = "/api/logistics/brand/returns";

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const droppedOffReturn = {
  id: "return-1",
  orderId: "8b3f4e3a-6dac",
  source: "PARCEL_RETURNED",
  status: "DROPPED_OFF",
  createdAt: "2026-10-16T08:00:00.000Z",
  droppedOffAt: "2026-10-17T08:00:00.000Z",
  confirmedAt: null,
  isAutoConfirmed: false,
  lines: [{ productName: "Linen Shirt", sizeLabel: "M", resellableQty: 1, damagedQty: 1 }],
};

const renderPanel = (isOrderLogisticsOn = true) =>
  render(
    <>
      <BrandReturnsPanel isOrderLogisticsOn={isOrderLogisticsOn} />
      <Toaster />
    </>,
    { wrapper: createQueryClientWrapper() },
  );

describe("BrandReturnsPanel", () => {
  it("shows what came back and confirms it was received", async () => {
    let wasConfirmed = false;
    mswServer.use(
      http.get(BRAND_RETURNS_URL, () => okJson({ items: [droppedOffReturn], nextCursor: null })),
      http.post(`${BRAND_RETURNS_URL}/return-1/confirm`, () => {
        wasConfirmed = true;
        return okJson({ ...droppedOffReturn, status: "CONFIRMED" });
      }),
    );
    const user = userEvent.setup();
    renderPanel();

    expect(await screen.findByText(/The customer didn't take the parcel/)).toBeInTheDocument();
    expect(screen.getByText("Linen Shirt · M · 1 fine · 1 damaged")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm received" }));

    await waitFor(() => expect(wasConfirmed).toBe(true));
  });

  it("says when a return was confirmed automatically, and when there are none", async () => {
    mswServer.use(
      http.get(BRAND_RETURNS_URL, () =>
        okJson({
          items: [{ ...droppedOffReturn, status: "CONFIRMED", isAutoConfirmed: true }],
          nextCursor: null,
        }),
      ),
    );
    renderPanel();

    expect(await screen.findByText("Received (confirmed automatically)")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm received" })).not.toBeInTheDocument();
  });

  it("shows an empty state", async () => {
    mswServer.use(http.get(BRAND_RETURNS_URL, () => okJson({ items: [], nextCursor: null })));
    renderPanel();

    expect(await screen.findByText("No returns right now.")).toBeInTheDocument();
  });

  it("stays hidden while Outfiqe delivery is off and nothing is coming back", async () => {
    let requestCount = 0;
    mswServer.use(
      http.get(BRAND_RETURNS_URL, () => {
        requestCount += 1;
        return okJson({ items: [], nextCursor: null });
      }),
    );
    renderPanel(false);

    await waitFor(() => expect(requestCount).toBe(1));
    expect(screen.queryByText("No returns right now.")).not.toBeInTheDocument();
    expect(screen.queryByText("Returns coming back to you")).not.toBeInTheDocument();
  });

  it("still shows returns from earlier orders after Outfiqe delivery is switched off", async () => {
    mswServer.use(
      http.get(BRAND_RETURNS_URL, () => okJson({ items: [droppedOffReturn], nextCursor: null })),
    );
    renderPanel(false);

    expect(await screen.findByRole("button", { name: "Confirm received" })).toBeInTheDocument();
  });
});
