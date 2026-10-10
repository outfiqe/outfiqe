import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClientError } from "@/shared/lib/apiClient";

import type { BrandProduct } from "../api/brandProductsSchemas";
import { DiscountModal } from "./DiscountModal";

const setMutate = vi.fn().mockResolvedValue(undefined);
const updateMutate = vi.fn().mockResolvedValue(undefined);
const removeMutate = vi.fn().mockResolvedValue(undefined);

vi.mock("../hooks/useProductDiscount", () => ({
  useSetProductDiscount: () => ({ mutateAsync: setMutate, isPending: false }),
  useUpdateProductDiscount: () => ({ mutateAsync: updateMutate, isPending: false }),
  useRemoveProductDiscount: () => ({ mutateAsync: removeMutate, isPending: false }),
}));

vi.mock("@outfiqe/design-system", async () => {
  const actual = await vi.importActual("@outfiqe/design-system");
  return { ...actual, toast: { success: vi.fn(), error: vi.fn() } };
});

const buildProduct = (overrides: Partial<BrandProduct> = {}): BrandProduct => ({
  id: "product-1",
  name: "Denim Jacket",
  price: 2_000,
  effectivePrice: 2_000,
  activeDiscount: null,
  type: "tops",
  categories: [],
  categorySlugs: [],
  imageUrl: null,
  imageUrls: [],
  lowStock: false,
  status: "APPROVED",
  createdAt: new Date().toISOString(),
  sizes: [],
  isThrift: false,
  thriftConditionRating: null,
  thriftConditionNotes: null,
  isSoldOut: false,
  ...overrides,
});

beforeEach(() => {
  setMutate.mockClear();
  updateMutate.mockClear();
  removeMutate.mockClear();
});

const renderDiscountModal = (product: BrandProduct | null) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<DiscountModal product={product} onClose={vi.fn()} />, { wrapper });
};

describe("DiscountModal", () => {
  it("creates a new percent discount", async () => {
    renderDiscountModal(buildProduct());

    await userEvent.click(screen.getByRole("button", { name: "Start sale" }));

    expect(setMutate).toHaveBeenCalledWith({
      productId: "product-1",
      input: expect.objectContaining({
        discountType: "PERCENT",
        percentBasisPoints: 2_000,
        endsAt: null,
      }),
    });
  });

  it("prefills the existing discount and edits it in place", async () => {
    const product = buildProduct({
      activeDiscount: {
        id: "discount-1",
        discountType: "PERCENT",
        percentBasisPoints: 1_000,
        fixedAmount: null,
        startsAt: new Date().toISOString(),
        endsAt: null,
      },
    });

    renderDiscountModal(product);

    expect(screen.getByRole("button", { name: "Remove discount" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateMutate).toHaveBeenCalledWith({
      productId: "product-1",
      input: expect.objectContaining({ discountType: "PERCENT", percentBasisPoints: 1_000 }),
    });
  });

  it("falls back to creating a fresh discount when the cached one is already gone server-side", async () => {
    updateMutate.mockRejectedValueOnce(
      new ApiClientError("This product has no active discount to edit.", "DISCOUNT_NOT_FOUND"),
    );
    const product = buildProduct({
      activeDiscount: {
        id: "discount-1",
        discountType: "PERCENT",
        percentBasisPoints: 1_000,
        fixedAmount: null,
        startsAt: new Date().toISOString(),
        endsAt: null,
      },
    });

    renderDiscountModal(product);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateMutate).toHaveBeenCalled();
    expect(setMutate).toHaveBeenCalledWith({
      productId: "product-1",
      input: expect.objectContaining({ discountType: "PERCENT", percentBasisPoints: 1_000 }),
    });
  });

  it("removes the discount", async () => {
    const product = buildProduct({
      activeDiscount: {
        id: "discount-1",
        discountType: "FIXED",
        percentBasisPoints: null,
        fixedAmount: 400,
        startsAt: new Date().toISOString(),
        endsAt: null,
      },
    });

    renderDiscountModal(product);

    await userEvent.click(screen.getByRole("button", { name: "Remove discount" }));

    expect(removeMutate).toHaveBeenCalledWith("product-1");
  });

  it("renders nothing when there is no product", () => {
    const { container } = renderDiscountModal(null);
    expect(container).toBeEmptyDOMElement();
  });
});
