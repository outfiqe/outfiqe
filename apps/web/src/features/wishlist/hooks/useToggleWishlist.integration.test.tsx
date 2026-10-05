import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { mswServer } from "@test/integration/msw/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { type ReactNode, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/features/auth/context/AuthContext";
import { useInfiniteBrandProducts } from "@/features/brand-profile/hooks/useInfiniteBrandProducts";
import { ProductCard } from "@/features/landing/components/ProductCard";
import { toExploreProduct } from "@/features/products/api/toExploreProduct";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/brand/brand-1",
}));

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/features/auth/context/AuthContext", () => ({ useAuth: vi.fn() }));

const BROWSER_STALE_TIME_MS = 30 * 1000;
const BRAND_ID = "brand-1";
const PRODUCT_ID = "p1";

const aBrandProduct = (isSaved: boolean) => ({
  id: PRODUCT_ID,
  brand: "Studio One",
  name: "Everyday Tee",
  price: 1500,
  effectivePrice: 1500,
  discountPercent: null,
  type: "tops",
  categorySlugs: [],
  imageUrl: null,
  lowStock: false,
  isNew: false,
  isSaved,
  isThrift: false,
  thriftConditionRating: null,
  thriftConditionNotes: null,
  isSoldOut: false,
  creatorBuyerCount: 0,
  unitsSold: 0,
  avgRating: null,
  reviewCount: 0,
});

const serveBrandProductsAndStash = () => {
  const stashedProductIds = new Set<string>();
  const stashResponse = (saved: boolean) =>
    HttpResponse.json({ success: true, message: "Stash updated.", data: { saved } });

  mswServer.use(
    http.get(`/api/brands/${BRAND_ID}/products`, () =>
      HttpResponse.json({
        success: true,
        message: "Brand products.",
        data: {
          products: [aBrandProduct(stashedProductIds.has(PRODUCT_ID))],
          nextCursor: null,
          total: 1,
          brandCount: 1,
        },
      }),
    ),
    http.post(`/api/wishlist/${PRODUCT_ID}`, () => {
      stashedProductIds.add(PRODUCT_ID);
      return stashResponse(true);
    }),
    http.delete(`/api/wishlist/${PRODUCT_ID}`, () => {
      stashedProductIds.delete(PRODUCT_ID);
      return stashResponse(false);
    }),
  );
};

const BrandProductsWithFilterSwitch = () => {
  const brandProducts = useInfiniteBrandProducts(BRAND_ID);
  const [isGridShown, setIsGridShown] = useState(true);
  const products = brandProducts.data?.pages.flatMap((page) => page.products) ?? [];

  return (
    <>
      <button type="button" onClick={() => setIsGridShown((shown) => !shown)}>
        Switch filter
      </button>
      {isGridShown &&
        products.map((product) => (
          <ProductCard key={product.id} product={toExploreProduct(product)} />
        ))}
    </>
  );
};

const renderBrandProducts = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: BROWSER_STALE_TIME_MS },
      mutations: { retry: false },
    },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <BrandProductsWithFilterSwitch />
    </QueryClientProvider>,
  );
};

const switchFilterAwayAndBack = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByRole("button", { name: "Switch filter" }));
  await user.click(screen.getByRole("button", { name: "Switch filter" }));
};

describe("stashing from a brand page product card", () => {
  beforeEach(() => {
    vi.mocked(useAuth, { partial: true }).mockReturnValue({
      isAuthenticated: true,
      isStaff: false,
    });
    serveBrandProductsAndStash();
  });

  it("keeps a stash after the card is re-created from the cached list", async () => {
    const user = userEvent.setup();
    renderBrandProducts();

    await user.click(await screen.findByRole("button", { name: "Stash it" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Remove from stash" })).toBeEnabled(),
    );

    await switchFilterAwayAndBack(user);

    expect(await screen.findByRole("button", { name: "Remove from stash" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stash it" })).not.toBeInTheDocument();
  });

  it("keeps an un-stash after the card is re-created from the cached list", async () => {
    const user = userEvent.setup();
    renderBrandProducts();

    await user.click(await screen.findByRole("button", { name: "Stash it" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Remove from stash" })).toBeEnabled(),
    );
    await switchFilterAwayAndBack(user);
    await user.click(await screen.findByRole("button", { name: "Remove from stash" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Stash it" })).toBeEnabled());

    await switchFilterAwayAndBack(user);

    expect(await screen.findByRole("button", { name: "Stash it" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Remove from stash" })).not.toBeInTheDocument();
  });
});
