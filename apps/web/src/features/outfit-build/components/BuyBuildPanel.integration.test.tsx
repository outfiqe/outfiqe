import { mswServer } from "@test/integration/msw/server";
import { createTranslatedQueryWrapper } from "@test/integration/translationsWrapper";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth";

import type { BuyableBuildItem } from "../utils/outfitBoardRules";
import { BuyBuildPanel } from "./BuyBuildPanel";

vi.mock("@/features/auth", () => ({ useAuth: vi.fn() }));

const CART_URL = "/api/outfits/outfit-1/cart";

const ok = (data: unknown) => HttpResponse.json({ success: true, message: "ok", data });

const SHIRT: BuyableBuildItem = {
  productId: "shirt-1",
  productName: "Linen Shirt",
  sizes: [
    { label: "S", isInStock: false },
    { label: "M", isInStock: true },
  ],
  suggestedSizeLabel: "M",
};

const TROUSERS: BuyableBuildItem = {
  productId: "trousers-1",
  productName: "Wide Trousers",
  sizes: [{ label: "32", isInStock: true }],
};

const mockAuth = ({
  isAuthenticated,
  isShopper,
}: {
  isAuthenticated: boolean;
  isShopper: boolean;
}) =>
  vi.mocked(useAuth).mockReturnValue({ isAuthenticated, isShopper } as ReturnType<typeof useAuth>);

const renderPanel = () => {
  const { Wrapper } = createTranslatedQueryWrapper();
  return render(<BuyBuildPanel outfitId="outfit-1" items={[SHIRT, TROUSERS]} />, {
    wrapper: Wrapper,
  });
};

beforeEach(() => mockAuth({ isAuthenticated: true, isShopper: true }));

describe("BuyBuildPanel", () => {
  it("buys the full set in the chosen sizes and says what couldn't be added", async () => {
    let sentBody: unknown;
    mswServer.use(
      http.post(CART_URL, async ({ request }) => {
        sentBody = await request.json();
        return ok({
          cart: {},
          addedProductIds: ["shirt-1"],
          leftOut: [{ productId: "trousers-1", reason: "NO_SIZE_CHOSEN" }],
        });
      }),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Buy the full set" }));

    await waitFor(() =>
      expect(sentBody).toEqual({
        isFullSet: true,
        sizes: [{ productId: "shirt-1", sizeLabel: "M" }],
      }),
    );
    expect(await screen.findByText(/Added 1 item to your bag\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View bag" })).toHaveAttribute("href", "/cart");
    expect(screen.getByText("Wide Trousers — No size picked")).toBeInTheDocument();
  });

  it("adds only the ticked items that have a size", async () => {
    let sentBody: unknown;
    mswServer.use(
      http.post(CART_URL, async ({ request }) => {
        sentBody = await request.json();
        return ok({ cart: {}, addedProductIds: ["trousers-1"], leftOut: [] });
      }),
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("checkbox", { name: "Add Linen Shirt to my bag" }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Size of Wide Trousers" }), "32");
    await user.click(screen.getByRole("button", { name: "Add the ticked items" }));

    await waitFor(() =>
      expect(sentBody).toEqual({
        isFullSet: false,
        sizes: [{ productId: "trousers-1", sizeLabel: "32" }],
      }),
    );
  });

  it("asks for a pick before sending anything when nothing ticked has a size", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("checkbox", { name: "Add Linen Shirt to my bag" }));
    await user.click(screen.getByRole("button", { name: "Add the ticked items" }));

    expect(screen.getByText("Tick at least one item and pick its size.")).toBeInTheDocument();
  });

  it("marks sold-out sizes so they can't be picked", () => {
    renderPanel();

    expect(screen.getByRole("option", { name: "S (sold out)" })).toBeDisabled();
  });

  it("asks a signed-out visitor to sign in, and shows nothing to a brand account", () => {
    mockAuth({ isAuthenticated: false, isShopper: false });
    const { unmount } = renderPanel();
    expect(screen.getByRole("link", { name: "Sign in to buy from this build" })).toHaveAttribute(
      "href",
      "/login?redirect=%2Fbuilds%2Foutfit-1",
    );
    unmount();

    mockAuth({ isAuthenticated: true, isShopper: false });
    renderPanel();
    expect(screen.queryByRole("button", { name: "Buy the full set" })).not.toBeInTheDocument();
  });
});
