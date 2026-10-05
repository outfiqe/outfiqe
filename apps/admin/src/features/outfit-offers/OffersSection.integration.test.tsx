import { Toaster } from "@outfiqe/design-system";
import { mswServer } from "@test/integration/msw/server";
import { grantOnlyPlatformPermissions } from "@test/platformPermissionsMock";
import { renderWithRouter } from "@test/renderWithRouter";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { OffersSection } from "./OffersSection";

const OFFERS_URL = "http://localhost:3000/api/outfit-offers/admin";
const SERVER_ERROR_STATUS = 500;

const offer = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "offer-1",
  outfitId: "outfit-1",
  outfitTitle: "Dashain set",
  brand: { id: "brand-1", name: "Kastha" },
  creator: { id: "creator-1", name: "Asha Rai", handle: "asha" },
  amount: 5000,
  paymentMethod: "KHALTI" as const,
  status: "POSTED" as const,
  refundStatus: "NOT_NEEDED" as const,
  payoutStatus: "NONE" as const,
  postBy: null,
  releaseAt: "2026-10-10T00:00:00.000Z",
  createdAt: "2026-10-01T00:00:00.000Z",
  ...overrides,
});

const okJson = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const renderSection = () =>
  renderWithRouter(
    <>
      <OffersSection />
      <Toaster />
    </>,
    { path: "/commissions" },
  );

describe("OffersSection", () => {
  it("starts on offers waiting on the creator and shows the empty state", async () => {
    const requestedStatuses: (string | null)[] = [];
    mswServer.use(
      http.get(OFFERS_URL, ({ request }) => {
        requestedStatuses.push(new URL(request.url).searchParams.get("status"));
        return okJson({ items: [], nextCursor: null });
      }),
    );

    renderSection();

    expect(await screen.findByText("Nothing here right now.")).toBeInTheDocument();
    expect(requestedStatuses).toContain("AWAITING_RESPONSE");
  });

  it("filters by refund status on the manual refund tab", async () => {
    const requestedRefundStatuses: (string | null)[] = [];
    mswServer.use(
      http.get(OFFERS_URL, ({ request }) => {
        requestedRefundStatuses.push(new URL(request.url).searchParams.get("refundStatus"));
        return okJson({ items: [], nextCursor: null });
      }),
    );

    renderSection();
    await userEvent.click(await screen.findByRole("button", { name: "Needs manual refund" }));

    await waitFor(() => expect(requestedRefundStatuses).toContain("NEEDS_MANUAL_REFUND"));
  });

  it("shows an error when offers fail to load", async () => {
    mswServer.use(
      http.get(OFFERS_URL, () =>
        HttpResponse.json({ success: false, message: "boom" }, { status: SERVER_ERROR_STATUS }),
      ),
    );

    renderSection();

    expect(await screen.findByText("Couldn't load offers.")).toBeInTheDocument();
  });

  it("releases a posted offer to the creator with a reason", async () => {
    let releaseBody: unknown;
    mswServer.use(
      http.get(OFFERS_URL, () => okJson({ items: [offer()], nextCursor: null })),
      http.post(`${OFFERS_URL}/offer-1/release`, async ({ request }) => {
        releaseBody = await request.json();
        return okJson(offer({ status: "RELEASED", payoutStatus: "AVAILABLE" }));
      }),
    );

    renderSection();

    expect(await screen.findByRole("heading", { name: "Kastha → Asha Rai" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Release to muse" }));
    const dialog = await screen.findByRole("dialog", { name: "Release offer to the muse" });
    await userEvent.type(
      within(dialog).getByLabelText("Why are you releasing this offer?"),
      "Look checked by hand.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Release to muse" }));

    await waitFor(() => expect(releaseBody).toEqual({ reason: "Look checked by hand." }));
    expect(await screen.findByText("Offer updated.")).toBeInTheDocument();
  });

  it("records a manual refund on an offer that needs one", async () => {
    let markRefundedCalled = false;
    mswServer.use(
      http.get(OFFERS_URL, () =>
        okJson({
          items: [offer({ status: "DECLINED", refundStatus: "NEEDS_MANUAL_REFUND" })],
          nextCursor: null,
        }),
      ),
      http.post(`${OFFERS_URL}/offer-1/mark-refunded`, () => {
        markRefundedCalled = true;
        return okJson(offer({ status: "DECLINED", refundStatus: "REFUNDED" }));
      }),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Mark refunded" }));
    expect(screen.queryByRole("button", { name: "Release to muse" })).not.toBeInTheDocument();
    const dialog = await screen.findByRole("dialog", { name: "Record a manual refund" });
    await userEvent.type(
      within(dialog).getByLabelText("How was the brand refunded? (reference)"),
      "eSewa ref 991",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Mark refunded" }));

    await waitFor(() => expect(markRefundedCalled).toBe(true));
  });

  it("shows the server's message when an action is refused", async () => {
    mswServer.use(
      http.get(OFFERS_URL, () =>
        okJson({ items: [offer({ status: "AWAITING_RESPONSE" })], nextCursor: null }),
      ),
      http.post(`${OFFERS_URL}/offer-1/refund`, () =>
        HttpResponse.json(
          { success: false, message: "This offer can no longer be refunded." },
          { status: 409 },
        ),
      ),
    );

    renderSection();

    await userEvent.click(await screen.findByRole("button", { name: "Refund brand" }));
    const dialog = await screen.findByRole("dialog", { name: "Refund the brand" });
    await userEvent.type(
      within(dialog).getByLabelText("Why are you refunding this offer?"),
      "Brand asked.",
    );
    await userEvent.click(within(dialog).getByRole("button", { name: "Refund brand" }));

    expect(await screen.findByText("This offer can no longer be refunded.")).toBeInTheDocument();
  });

  it("hides the actions from staff who can only read commissions", async () => {
    grantOnlyPlatformPermissions("platform:commissions:read");
    mswServer.use(http.get(OFFERS_URL, () => okJson({ items: [offer()], nextCursor: null })));

    renderSection();

    expect(await screen.findByRole("heading", { name: "Kastha → Asha Rai" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Release to muse" })).not.toBeInTheDocument();
  });

  it("loads more offers when there is a next page", async () => {
    mswServer.use(
      http.get(OFFERS_URL, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        return okJson({
          items: cursor
            ? [offer({ id: "offer-2", brand: { id: "brand-2", name: "Dhaka House" } })]
            : [offer()],
          nextCursor: cursor ? null : "offer-1",
        });
      }),
    );

    renderSection();

    await screen.findByRole("heading", { name: "Kastha → Asha Rai" });
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(
      await screen.findByRole("heading", { name: "Dhaka House → Asha Rai" }),
    ).toBeInTheDocument();
  });
});
