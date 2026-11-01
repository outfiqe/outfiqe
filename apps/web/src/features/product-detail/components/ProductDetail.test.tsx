import { ANALYTICS_EVENTS } from "@outfiqe/utils";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductDetail as ProductDetailType } from "../api/productDetailSchemas";
import { ProductDetail } from "./ProductDetail";

const addToCart = vi.fn();
const trackEvent = vi.fn();
const authState = { isAuthenticated: true, isBrandOwner: false, isStaff: false };

vi.mock("@/features/analytics/utils/analyticsClient", () => ({
  trackEvent: (...trackedEvent: unknown[]) => trackEvent(...trackedEvent),
}));

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/features/cart", () => ({
  useAddToCart: () => ({ mutate: addToCart, isPending: false }),
}));

const wishlistMutationState = { isPending: false };

vi.mock("@/features/wishlist", () => ({
  useToggleWishlist: () => ({ mutate: vi.fn(), isPending: wishlistMutationState.isPending }),
  STAFF_CANNOT_SAVE_PRODUCT_MESSAGE: "Staff accounts can't save products.",
}));

vi.mock("@/features/checkout", () => ({
  saveBuyNowPayload: vi.fn(),
}));

vi.mock("@/features/product-reviews", () => ({
  ReviewsSection: () => null,
}));

vi.mock("./SeenOnCreators", () => ({
  SeenOnCreators: () => null,
}));

vi.mock("./ShippingInfo", () => ({
  ShippingInfo: () => null,
}));

const featureFlagState = { isSizeFitOn: false };

vi.mock("@/shared/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => featureFlagState.isSizeFitOn,
}));

vi.mock("@/features/size-fit/hooks/useFitProfile", () => ({
  useFitProfile: () => ({ data: null }),
  useSaveFitProfile: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
}));

type SizeFixture = Omit<ProductDetailType["sizes"][number], "fitRange"> &
  Partial<Pick<ProductDetailType["sizes"][number], "fitRange">>;

const buildProduct = (
  sizes: SizeFixture[],
  overrides: Partial<ProductDetailType> = {},
): ProductDetailType => ({
  id: "product-1",
  brand: { id: "brand-1", name: "Kastha" },
  name: "Wool Bomber",
  price: 5400,
  effectivePrice: 5400,
  discountPercent: null,
  type: "outerwear",
  categorySlugs: ["streetwear"],
  imageUrl: null,
  lowStock: false,
  isNew: false,
  isThrift: false,
  thriftConditionRating: null,
  thriftConditionNotes: null,
  isSoldOut: false,
  sizes: sizes.map((size) => ({ fitRange: null, ...size })),
  isStretchable: null,
  hasSizeChart: false,
  images: [],
  wornByCount: 0,
  seenOnCreators: [],
  isSaved: false,
  avgRating: null,
  reviewCount: 0,
  rating1Count: 0,
  rating2Count: 0,
  rating3Count: 0,
  rating4Count: 0,
  rating5Count: 0,
  ...overrides,
});

const cta = (name: RegExp) => screen.getByRole("button", { name });

beforeEach(() => {
  featureFlagState.isSizeFitOn = false;
  trackEvent.mockClear();
});

describe("ProductDetail analytics", () => {
  it("records one product view with the brand, the price paid and the thrift flag", () => {
    const product = buildProduct([{ id: "m", label: "M", inStock: true }], {
      effectivePrice: 4320,
      isThrift: true,
    });

    const { rerender } = render(<ProductDetail product={product} />);
    rerender(<ProductDetail product={product} />);

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith(ANALYTICS_EVENTS.PRODUCT_DETAIL_VIEW, {
      product_id: "product-1",
      brand_id: "brand-1",
      product_price_npr: 4320,
      is_thrift: true,
    });
  });
});

describe("ProductDetail out-of-stock handling", () => {
  beforeEach(() => {
    addToCart.mockClear();
  });

  it("shows Out of stock and disables the CTAs when every size is sold out", () => {
    render(
      <ProductDetail
        product={buildProduct([
          { id: "s", label: "S", inStock: false },
          { id: "m", label: "M", inStock: false },
        ])}
      />,
    );

    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(screen.queryByText("Select a size to continue.")).not.toBeInTheDocument();
    expect(cta(/add to cart/i)).toBeDisabled();
    expect(cta(/buy now/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
  });

  it("shows Out of stock when the only size is sold out", () => {
    render(
      <ProductDetail product={buildProduct([{ id: "one", label: "One size", inStock: false }])} />,
    );

    expect(screen.getByText("Out of stock")).toBeInTheDocument();
    expect(cta(/add to cart/i)).toBeDisabled();
  });

  it("shows a one-of-a-kind sold message instead of Out of stock for a sold-out thrift piece", () => {
    render(
      <ProductDetail
        product={buildProduct([{ id: "one", label: "One size", inStock: false }], {
          isThrift: true,
        })}
      />,
    );

    expect(screen.queryByText("Out of stock")).not.toBeInTheDocument();
    expect(screen.getByText(/sold — this one-of-a-kind piece is gone/i)).toBeInTheDocument();
    expect(cta(/add to cart/i)).toBeDisabled();
  });

  it("shows the thrift tag, condition rating and notes for a thrift listing", () => {
    render(
      <ProductDetail
        product={buildProduct([{ id: "one", label: "One size", inStock: true }], {
          isThrift: true,
          thriftConditionRating: "GOOD",
          thriftConditionNotes: "Small mark on the left cuff.",
        })}
      />,
    );

    expect(screen.getByText(/thrift/i)).toBeInTheDocument();
    expect(screen.getByText(/good/i)).toBeInTheDocument();
    expect(screen.getByText("Small mark on the left cuff.")).toBeInTheDocument();
  });

  it("auto-selects the first available size and enables the CTAs", () => {
    render(
      <ProductDetail
        product={buildProduct([
          { id: "s", label: "S", inStock: false },
          { id: "m", label: "M", inStock: true },
        ])}
      />,
    );

    expect(screen.queryByText("Out of stock")).not.toBeInTheDocument();
    expect(screen.queryByText("Select a size to continue.")).not.toBeInTheDocument();
    expect(cta(/add to cart/i)).toBeEnabled();
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeEnabled();

    cta(/add to cart/i).click();
    expect(addToCart).toHaveBeenCalledWith(
      expect.objectContaining({ productId: "product-1", sizeId: "m", qty: 1 }),
      expect.anything(),
    );
  });
});

describe("ProductDetail thrift purchase consent", () => {
  beforeEach(() => {
    addToCart.mockClear();
  });

  it("shows a consent modal before adding a thrift item to the cart", () => {
    render(
      <ProductDetail
        product={buildProduct([{ id: "one", label: "One size", inStock: true }], {
          isThrift: true,
          thriftConditionRating: "GOOD",
          thriftConditionNotes: "Small mark on the left cuff.",
        })}
      />,
    );

    fireEvent.click(cta(/add to cart/i));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("You're buying a secondhand piece")).toBeInTheDocument();
    expect(within(dialog).getByText("Small mark on the left cuff.")).toBeInTheDocument();
    expect(addToCart).not.toHaveBeenCalled();
  });

  it("adds to cart only after the shopper confirms", () => {
    render(
      <ProductDetail
        product={buildProduct([{ id: "one", label: "One size", inStock: true }], {
          isThrift: true,
        })}
      />,
    );

    fireEvent.click(cta(/add to cart/i));
    fireEvent.click(screen.getByRole("button", { name: /i understand, continue/i }));

    expect(addToCart).toHaveBeenCalledOnce();
    expect(screen.queryByText("You're buying a secondhand piece")).not.toBeInTheDocument();
  });

  it("doesn't add to cart when the shopper cancels", () => {
    render(
      <ProductDetail
        product={buildProduct([{ id: "one", label: "One size", inStock: true }], {
          isThrift: true,
        })}
      />,
    );

    fireEvent.click(cta(/add to cart/i));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(addToCart).not.toHaveBeenCalled();
    expect(screen.queryByText("You're buying a secondhand piece")).not.toBeInTheDocument();
  });

  it("doesn't ask again once the shopper has already confirmed once on this page", () => {
    render(
      <ProductDetail
        product={buildProduct([{ id: "one", label: "One size", inStock: true }], {
          isThrift: true,
        })}
      />,
    );

    fireEvent.click(cta(/add to cart/i));
    fireEvent.click(screen.getByRole("button", { name: /i understand, continue/i }));
    addToCart.mockClear();

    fireEvent.click(cta(/add to cart/i));

    expect(screen.queryByText("You're buying a secondhand piece")).not.toBeInTheDocument();
    expect(addToCart).toHaveBeenCalledOnce();
  });

  it("never shows the consent modal for a non-thrift item", () => {
    render(<ProductDetail product={buildProduct([{ id: "m", label: "M", inStock: true }])} />);

    fireEvent.click(cta(/add to cart/i));

    expect(screen.queryByText("You're buying a secondhand piece")).not.toBeInTheDocument();
    expect(addToCart).toHaveBeenCalledOnce();
  });
});

describe("ProductDetail buy controls by account type", () => {
  beforeEach(() => {
    authState.isBrandOwner = false;
    authState.isStaff = false;
  });

  it("hides Add to cart and Buy now from a brand owner and explains why", () => {
    authState.isBrandOwner = true;
    render(<ProductDetail product={buildProduct([{ id: "m", label: "M", inStock: true }])} />);

    expect(screen.queryByRole("button", { name: /add to cart/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /buy now/i })).not.toBeInTheDocument();
    expect(screen.getByText("Shopping is available on customer accounts.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stash" })).toBeInTheDocument();
  });

  it("shows a brand owner the sizes but lets them pick neither a size nor a quantity", () => {
    authState.isBrandOwner = true;
    render(<ProductDetail product={buildProduct([{ id: "m", label: "M", inStock: true }])} />);

    expect(screen.getByRole("button", { name: "M" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Decrease quantity" })).toBeDisabled();
  });

  it("lets a shopper pick a size and change the quantity", () => {
    render(<ProductDetail product={buildProduct([{ id: "m", label: "M", inStock: true }])} />);

    expect(screen.getByRole("button", { name: "M" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeEnabled();
  });

  it("hides the buy controls from an admin too, and disables saving", () => {
    authState.isStaff = true;
    render(<ProductDetail product={buildProduct([{ id: "m", label: "M", inStock: true }])} />);

    expect(screen.queryByRole("button", { name: /add to cart/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /buy now/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Stash" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "M" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled();
  });

  it("keeps the buy controls for a shopper", () => {
    render(<ProductDetail product={buildProduct([{ id: "m", label: "M", inStock: true }])} />);

    expect(screen.getByRole("button", { name: /add to cart/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buy now/i })).toBeInTheDocument();
  });
});

describe("ProductDetail save button", () => {
  beforeEach(() => {
    wishlistMutationState.isPending = false;
  });

  it("disables the save button while a wishlist toggle is already in flight", () => {
    wishlistMutationState.isPending = true;
    render(<ProductDetail product={buildProduct([{ id: "m", label: "M", inStock: true }])} />);

    expect(screen.getByRole("button", { name: "Stash" })).toBeDisabled();
  });

  it("picks up a fresh isSaved prop from a later fetch, not just the value it first mounted with", () => {
    const sizes = [{ id: "m", label: "M", inStock: true }];
    const { rerender } = render(
      <ProductDetail product={buildProduct(sizes, { isSaved: false })} />,
    );
    expect(screen.getByRole("button", { name: "Stash" })).toHaveAttribute("aria-pressed", "false");

    rerender(<ProductDetail product={buildProduct(sizes, { isSaved: true })} />);

    expect(screen.getByRole("button", { name: "Stash" })).toHaveAttribute("aria-pressed", "true");
  });

  describe("size chart", () => {
    const chartedSizes = [
      {
        id: "m",
        label: "M",
        inStock: true,
        fitRange: { minHeightCm: 160, maxHeightCm: 170, minWeightKg: 55, maxWeightKg: 65 },
      },
      {
        id: "l",
        label: "L",
        inStock: true,
        fitRange: { minHeightCm: 170, maxHeightCm: 180, minWeightKg: 65, maxWeightKg: 75 },
      },
    ];

    it("shows the brand's chart and stretch once size_fit is on", () => {
      featureFlagState.isSizeFitOn = true;
      render(
        <ProductDetail
          product={buildProduct(chartedSizes, { hasSizeChart: true, isStretchable: true })}
        />,
      );

      expect(screen.getByRole("table", { name: "Size chart for Wool Bomber" })).toBeInTheDocument();
      expect(screen.getByText("Stretchable fabric")).toBeInTheDocument();
    });

    it.each([
      ["size_fit is off", false, true],
      ["the product has no complete chart", true, false],
    ])("hides the chart when %s", (_description, isSizeFitOn, hasSizeChart) => {
      featureFlagState.isSizeFitOn = isSizeFitOn;
      render(<ProductDetail product={buildProduct(chartedSizes, { hasSizeChart })} />);

      expect(screen.queryByRole("button", { name: "Find my size" })).not.toBeInTheDocument();
    });

    it("selects the size the modal recommends", () => {
      featureFlagState.isSizeFitOn = true;
      render(<ProductDetail product={buildProduct(chartedSizes, { hasSizeChart: true })} />);

      fireEvent.click(screen.getByRole("button", { name: "Find my size" }));
      fireEvent.change(screen.getByLabelText("Height (cm)"), { target: { value: "175" } });
      fireEvent.change(screen.getByLabelText("Weight (kg)"), { target: { value: "70" } });
      fireEvent.click(screen.getByRole("button", { name: "Select L" }));

      expect(screen.getByRole("button", { name: "L" })).toHaveAttribute("aria-pressed", "true");
    });
  });
});
