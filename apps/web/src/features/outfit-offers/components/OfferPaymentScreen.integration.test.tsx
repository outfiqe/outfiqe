import { mswServer } from "@test/integration/msw/server";
import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { redirectToPaymentGateway } from "@/features/payments";

import { buildOffer, ok } from "../testing/offerFixtures";
import { OfferPaymentScreen } from "./OfferPaymentScreen";

vi.mock("@/features/payments", () => ({ redirectToPaymentGateway: vi.fn() }));

const VERIFY_URL = "/api/outfit-offers/offer-1/payment/verify";
const RETRY_URL = "/api/outfit-offers/offer-1/payment";
const GATEWAY_REDIRECT = { mode: "REDIRECT", redirectUrl: "https://pay.khalti.test/retry" };

const renderScreen = (gatewayReportedFailure = false) => {
  const { Wrapper } = createTranslatedQueryWrapper();
  return render(
    <OfferPaymentScreen offerId="offer-1" gatewayReportedFailure={gatewayReportedFailure} />,
    { wrapper: Wrapper },
  );
};

beforeEach(() => vi.mocked(redirectToPaymentGateway).mockReset());

describe("OfferPaymentScreen", () => {
  it("confirms the offer was sent once the payment is verified", async () => {
    mswServer.use(
      http.post(VERIFY_URL, () => ok({ offer: buildOffer(), isPaid: true, isFailed: false })),
    );
    renderScreen();

    expect(await screen.findByRole("heading", { name: "Offer sent" })).toBeInTheDocument();
    expect(screen.getByText("We've told Ram about your offer.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to the build" })).toHaveAttribute(
      "href",
      "/builds/outfit-1",
    );
  });

  it("offers to pay again after a failed payment and goes back to the gateway", async () => {
    mswServer.use(
      http.post(VERIFY_URL, () =>
        ok({ offer: buildOffer({ status: "PAYMENT_FAILED" }), isPaid: false, isFailed: true }),
      ),
      http.post(RETRY_URL, () =>
        ok({ offer: buildOffer({ status: "PAYMENT_PENDING" }), payment: GATEWAY_REDIRECT }),
      ),
    );
    const user = userEvent.setup();
    renderScreen();

    expect(
      await screen.findByRole("heading", { name: "Payment didn't go through" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try paying again" }));

    await waitFor(() => expect(redirectToPaymentGateway).toHaveBeenCalledWith(GATEWAY_REDIRECT));
  });

  it("trusts the gateway's own failure report while the check is still running", () => {
    mswServer.use(http.post(VERIFY_URL, () => new Promise<never>(() => undefined)));
    renderScreen(true);

    expect(screen.getByRole("heading", { name: "Payment didn't go through" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "See my offers" })).toHaveAttribute("href", "/offers");
  });

  it("shows a checking state while the payment is being confirmed", () => {
    mswServer.use(http.post(VERIFY_URL, () => new Promise<never>(() => undefined)));
    renderScreen();

    expect(screen.getByText("Checking your payment…")).toBeInTheDocument();
  });
});
