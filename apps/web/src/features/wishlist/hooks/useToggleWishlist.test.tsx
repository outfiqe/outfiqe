import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { createQueryClientWrapper } from "@test/integration/queryClientWrapper";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useToggleWishlist } from "./useToggleWishlist";

const trackEvent = vi.fn();

vi.mock("@/features/analytics/utils/analyticsClient", () => ({
  trackEvent: (...trackedEvent: unknown[]) => trackEvent(...trackedEvent),
}));

vi.mock("../api/wishlistApi", () => ({
  wishlistApi: { save: vi.fn(async () => undefined), unsave: vi.fn(async () => undefined) },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("useToggleWishlist analytics", () => {
  it("records a save", async () => {
    const { result } = renderHook(useToggleWishlist, { wrapper: createQueryClientWrapper() });

    await act(() => result.current.mutateAsync({ productId: "product-1", saved: false }));

    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.WISHLIST_ITEM_ADD, {
      product_id: "product-1",
    });
  });

  it("records nothing when the product is removed from the wishlist", async () => {
    const { result } = renderHook(useToggleWishlist, { wrapper: createQueryClientWrapper() });

    await act(() => result.current.mutateAsync({ productId: "product-1", saved: true }));

    expect(trackEvent).not.toHaveBeenCalled();
  });
});
