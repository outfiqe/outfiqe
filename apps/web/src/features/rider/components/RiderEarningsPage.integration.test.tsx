import { mswServer } from "@test/integration/msw/server";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it, vi } from "vitest";

import { RiderEarningsPage } from "./RiderEarningsPage";

vi.mock("@/features/withdraw", () => ({
  OwnerType: { CREATOR: "CREATOR", BUSINESS: "BUSINESS" },
  WithdrawSection: ({ ownerType, title }: { ownerType: string; title: string }) => (
    <section aria-label={title} data-owner-type={ownerType} />
  ),
}));

const RIDER_EARNINGS_URL = "/api/logistics/rider/earnings";

const emptySummary = { currency: "NPR", pendingAmount: 0, availableAmount: 0, withdrawnAmount: 0 };

const respondWithEarnings = (earningsPage: unknown) =>
  mswServer.use(
    http.get(RIDER_EARNINGS_URL, () =>
      HttpResponse.json({ success: true, message: "ok", data: earningsPage }),
    ),
  );

const renderEarningsPage = () =>
  render(<RiderEarningsPage />, { wrapper: createQueryClientWrapper() });

describe("RiderEarningsPage", () => {
  it("shows what the rider has earned and lets them withdraw it", async () => {
    respondWithEarnings({
      summary: {
        currency: "NPR",
        pendingAmount: 100,
        availableAmount: 1250,
        withdrawnAmount: 3000,
      },
      items: [
        {
          id: "earning-1",
          brandName: "Kathmandu Knits",
          pickupLocationLabel: "Thamel shop",
          kind: "VISIT",
          currency: "NPR",
          stopCount: 3,
          amount: 100,
          status: "PENDING",
          earnedAt: "2026-10-17T05:15:00.000Z",
          releasesAt: "2026-10-24T05:15:00.000Z",
          voidReason: null,
        },
        {
          id: "earning-2",
          brandName: "Patan Prints",
          pickupLocationLabel: "Main store",
          kind: "WASTED_VISIT",
          currency: "NPR",
          stopCount: 0,
          amount: 35,
          status: "VOIDED",
          earnedAt: "2026-10-16T05:15:00.000Z",
          releasesAt: "2026-10-23T05:15:00.000Z",
          voidReason: "Shop was open",
        },
      ],
      nextCursor: null,
    });

    renderEarningsPage();

    expect(await screen.findByText("Kathmandu Knits · Thamel shop")).toBeInTheDocument();
    expect(screen.getByText("Rs. 1,250")).toBeInTheDocument();
    expect(screen.getByText(/3 bags/)).toBeInTheDocument();
    expect(screen.getByText(/Ready to withdraw from/)).toBeInTheDocument();
    expect(screen.getByText("Cancelled: Shop was open")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Withdraw your earnings" })).toHaveAttribute(
      "data-owner-type",
      "CREATOR",
    );
  });

  it("says so before the first visit is finished", async () => {
    respondWithEarnings({ summary: emptySummary, items: [], nextCursor: null });

    renderEarningsPage();

    expect(
      await screen.findByText("No earnings yet. Finish a visit and it shows up here."),
    ).toBeInTheDocument();
  });

  it("offers to try again when the earnings can't load", async () => {
    mswServer.use(http.get(RIDER_EARNINGS_URL, () => HttpResponse.json({}, { status: 500 })));

    renderEarningsPage();

    expect(
      await screen.findByText("We couldn't load your earnings. Check your signal and try again."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
