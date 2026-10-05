import { IDEMPOTENCY_HEADER } from "@outfiqe/client";
import { mswServer } from "@test/integration/msw/server";
import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";
import { redirectToPaymentGateway } from "@/features/payments";

import { buildOffer, ok } from "../testing/offerFixtures";
import { BuildOffersSection } from "./BuildOffersSection";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/features/payments", () => ({ redirectToPaymentGateway: vi.fn() }));

const BUILD_OFFERS_URL = "/api/outfit-offers/builds/outfit-1";
const GATEWAY_REDIRECT = { mode: "REDIRECT", redirectUrl: "https://pay.khalti.test/abc" };
const RAM = { id: "creator-1", name: "Ram" };
const SERVER_ERROR_STATUS = 500;

const mockAuth = ({ isBrandOwner = false, isCreator = false } = {}) =>
  vi.mocked(useAuth).mockReturnValue({
    isBrandOwner,
    isCreator,
    state: { user: { id: "me" } },
  } as ReturnType<typeof useAuth>);

const renderSection = ({ isLocked = true, isMember = true, people = [RAM] } = {}) => {
  const { Wrapper } = createTranslatedQueryWrapper();
  return render(
    <BuildOffersSection
      outfitId="outfit-1"
      isLocked={isLocked}
      isMember={isMember}
      people={people}
    />,
    { wrapper: Wrapper },
  );
};

beforeEach(() => {
  vi.mocked(redirectToPaymentGateway).mockReset();
  mswServer.use(http.get(BUILD_OFFERS_URL, () => ok([])));
});

describe("BuildOffersSection", () => {
  it("lets a brand on a locked build pay for an offer and sends them to the gateway", async () => {
    mockAuth({ isBrandOwner: true });
    let sentBody: unknown;
    let idempotencyKey: string | null = null;
    mswServer.use(
      http.post(BUILD_OFFERS_URL, async ({ request }) => {
        sentBody = await request.json();
        idempotencyKey = request.headers.get(IDEMPOTENCY_HEADER);
        return ok({ offer: buildOffer({ status: "PAYMENT_PENDING" }), payment: GATEWAY_REDIRECT });
      }),
    );
    const user = userEvent.setup();
    renderSection();

    expect(await screen.findByText("No offers on this build yet.")).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Creator" }), "creator-1");
    await user.type(screen.getByRole("textbox", { name: "Amount (Rs)" }), "5000");
    await user.click(screen.getByRole("radio", { name: "eSewa" }));
    await user.type(screen.getByRole("textbox", { name: /Note to the creator/ }), "Love this set");
    await user.click(screen.getByRole("button", { name: "Pay and send offer" }));

    await waitFor(() =>
      expect(sentBody).toEqual({
        creatorId: "creator-1",
        amount: 5000,
        paymentMethod: "ESEWA",
        note: "Love this set",
      }),
    );
    expect(idempotencyKey).toBeTruthy();
    await waitFor(() => expect(redirectToPaymentGateway).toHaveBeenCalledWith(GATEWAY_REDIRECT));
  });

  it("asks for a creator and a whole-rupee amount before sending anything", async () => {
    mockAuth({ isBrandOwner: true });
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole("button", { name: "Pay and send offer" }));
    expect(screen.getByText("Pick the creator you want to pay.")).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox", { name: "Creator" }), "creator-1");
    await user.type(screen.getByRole("textbox", { name: "Amount (Rs)" }), "12.5");
    await user.click(screen.getByRole("button", { name: "Pay and send offer" }));
    expect(screen.getByText("Enter the amount in whole rupees.")).toBeInTheDocument();
  });

  it("says when no one on the build can take an offer", () => {
    mockAuth({ isBrandOwner: true });
    renderSection({ people: [] });

    expect(
      screen.getByText("There's no creator on this build to send an offer to."),
    ).toBeInTheDocument();
  });

  it("hides the send form until the build is locked, and from brands not on the build", () => {
    mockAuth({ isBrandOwner: true });
    const { unmount } = renderSection({ isLocked: false });
    expect(screen.queryByRole("button", { name: "Pay and send offer" })).not.toBeInTheDocument();
    unmount();

    renderSection({ isMember: false });
    expect(screen.queryByRole("button", { name: "Pay and send offer" })).not.toBeInTheDocument();
  });

  it("lets the creator accept an offer made to them", async () => {
    mockAuth({ isCreator: true });
    let acceptedOfferUrl: string | null = null;
    mswServer.use(
      http.get(BUILD_OFFERS_URL, () => ok([buildOffer({ viewerSide: "CREATOR" })])),
      http.post("/api/outfit-offers/offer-1/accept", ({ request }) => {
        acceptedOfferUrl = new URL(request.url).pathname;
        return ok(buildOffer({ viewerSide: "CREATOR", status: "ACCEPTED" }));
      }),
    );
    const user = userEvent.setup();
    renderSection();

    expect(await screen.findByText("From Kastha")).toBeInTheDocument();
    expect(screen.getByText("Waiting for answer")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pay and send offer" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Accept" }));

    await waitFor(() => expect(acceptedOfferUrl).toBe("/api/outfit-offers/offer-1/accept"));
  });

  it("tells the brand how a refund is going on a declined offer", async () => {
    mockAuth({ isBrandOwner: true });
    mswServer.use(
      http.get(BUILD_OFFERS_URL, () =>
        ok([buildOffer({ status: "DECLINED", refundStatus: "NEEDS_MANUAL_REFUND" })]),
      ),
    );
    renderSection();

    expect(await screen.findByText("To Ram")).toBeInTheDocument();
    expect(
      screen.getByText("Our team is refunding this by hand. It can take a few working days."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel offer" })).not.toBeInTheDocument();
  });

  it("says so when offers fail to load", async () => {
    mockAuth({ isCreator: true });
    mswServer.use(
      http.get(BUILD_OFFERS_URL, () =>
        HttpResponse.json({ success: false, message: "boom" }, { status: SERVER_ERROR_STATUS }),
      ),
    );
    renderSection();

    expect(await screen.findByText("Couldn't load offers. Try again.")).toBeInTheDocument();
  });

  it("shows nothing to a plain shopper", () => {
    mockAuth();
    const { container } = renderSection();

    expect(container).toBeEmptyDOMElement();
  });
});
