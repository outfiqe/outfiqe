import { mswServer } from "@test/integration/msw/server";
import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http } from "msw";
import { describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import { buildOffer, ok } from "../testing/offerFixtures";
import { OffersPage } from "./OffersPage";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));

const SENT_URL = "/api/outfit-offers/sent";
const RECEIVED_URL = "/api/outfit-offers/received";

const mockAuth = (isBrandOwner: boolean) =>
  vi.mocked(useAuth).mockReturnValue({ isBrandOwner } as ReturnType<typeof useAuth>);

const renderPage = () => {
  const { Wrapper } = createTranslatedQueryWrapper();
  return render(<OffersPage />, { wrapper: Wrapper });
};

describe("OffersPage", () => {
  it("shows a brand the offers it sent, with a link to each build, and loads more", async () => {
    mockAuth(true);
    mswServer.use(
      http.get(SENT_URL, ({ request }) => {
        const cursor = new URL(request.url).searchParams.get("cursor");
        return cursor
          ? ok({
              items: [buildOffer({ id: "offer-2", outfitTitle: "Tihar set" })],
              nextCursor: null,
            })
          : ok({ items: [buildOffer()], nextCursor: "offer-1" });
      }),
    );
    const user = userEvent.setup();
    renderPage();

    expect(await screen.findByRole("link", { name: "Dashain set" })).toHaveAttribute(
      "href",
      "/builds/outfit-1",
    );
    expect(screen.getByText("Cancel offer")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByRole("link", { name: "Tihar set" })).toBeInTheDocument();
  });

  it("lets a brand finish paying for an offer whose payment never completed", async () => {
    mockAuth(true);
    mswServer.use(
      http.get(SENT_URL, () =>
        ok({ items: [buildOffer({ status: "PAYMENT_PENDING" })], nextCursor: null }),
      ),
    );
    renderPage();

    expect(await screen.findByRole("button", { name: "Finish payment" })).toBeInTheDocument();
    expect(screen.getByText("Waiting for payment")).toBeInTheDocument();
  });

  it("shows a creator the offers they received, with an empty state when there are none", async () => {
    mockAuth(false);
    mswServer.use(http.get(RECEIVED_URL, () => ok({ items: [], nextCursor: null })));
    renderPage();

    expect(
      await screen.findByText(
        "No offers yet. When a brand offers to pay you to post a build, it shows up here.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Brands offering to pay you to post builds as looks."),
    ).toBeInTheDocument();
  });

  it("tells a creator when the money will be released on a posted offer", async () => {
    mockAuth(false);
    mswServer.use(
      http.get(RECEIVED_URL, () =>
        ok({
          items: [
            buildOffer({
              viewerSide: "CREATOR",
              status: "POSTED",
              releaseAt: "2026-10-10T10:00:00.000Z",
            }),
          ],
          nextCursor: null,
        }),
      ),
    );
    renderPage();

    expect(await screen.findByText(/Money is released on/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });
});
