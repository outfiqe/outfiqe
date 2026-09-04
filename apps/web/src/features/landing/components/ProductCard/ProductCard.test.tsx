import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type ExploreProduct, ProductCard } from "./index";

const push = vi.fn();
const mutate = vi.fn();
const useAuthMock = vi.fn(() => ({ isAuthenticated: false }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  usePathname: () => "/shop",
}));
vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => useAuthMock(),
}));
vi.mock("@/features/wishlist", () => ({
  useToggleWishlist: () => ({ mutate }),
}));
vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const buildProduct = (overrides: Partial<ExploreProduct> = {}): ExploreProduct => ({
  id: "product-1",
  brand: "Studio Nine",
  name: "Denim Jacket",
  price: 4500,
  creatorBuyerCount: 0,
  unitsSold: 0,
  ...overrides,
});

beforeEach(() => {
  push.mockClear();
  mutate.mockClear();
  useAuthMock.mockReturnValue({ isAuthenticated: false });
});

describe("ProductCard rating display", () => {
  it("shows a minimal star + average when the product has reviews", () => {
    render(<ProductCard product={buildProduct({ avgRating: 4.3, reviewCount: 12 })} />);
    expect(screen.getByText("4.3")).toBeInTheDocument();
  });

  it("omits the rating for a product with no reviews", () => {
    render(<ProductCard product={buildProduct({ avgRating: null, reviewCount: 0 })} />);
    expect(screen.queryByText(/^\d\.\d$/)).not.toBeInTheDocument();
  });
});

describe("ProductCard save button", () => {
  it("sends an unauthenticated shopper to login with a redirect back", async () => {
    render(<ProductCard product={buildProduct()} />);

    await userEvent.click(screen.getByRole("button", { name: "Save to wishlist" }));

    expect(push).toHaveBeenCalledWith("/login?redirect=%2Fshop");
    expect(mutate).not.toHaveBeenCalled();
  });

  it("toggles the wishlist and calls back when a signed-in shopper saves", async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true });
    const onToggleSaved = vi.fn();
    render(<ProductCard product={buildProduct()} onToggleSaved={onToggleSaved} />);

    const button = screen.getByRole("button", { name: "Save to wishlist" });
    await userEvent.click(button);

    expect(mutate).toHaveBeenCalledWith(
      { productId: "product-1", saved: false },
      expect.anything(),
    );
    expect(onToggleSaved).toHaveBeenCalledWith("product-1", true);
    expect(screen.getByRole("button", { name: "Remove from wishlist" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("rolls the pressed state back if the wishlist mutation errors", async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: true });
    mutate.mockImplementation((_vars, opts?: { onError?: () => void }) => opts?.onError?.());
    render(<ProductCard product={buildProduct({ isSaved: true })} />);

    await userEvent.click(screen.getByRole("button", { name: "Remove from wishlist" }));

    expect(screen.getByRole("button", { name: "Remove from wishlist" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});

describe("ProductCard badges and social proof", () => {
  it("labels a new product", () => {
    render(<ProductCard product={buildProduct({ isNew: true })} />);
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("labels a low-stock product when it is not new", () => {
    render(<ProductCard product={buildProduct({ lowStock: true })} />);
    expect(screen.getByText("Low stock")).toBeInTheDocument();
  });

  it("shows the trending rank badge instead of a label when ranked", () => {
    render(<ProductCard product={buildProduct({ isNew: true })} trendingRank={1} />);
    expect(screen.queryByText("New")).not.toBeInTheDocument();
  });

  it("summarises creator and buyer counts, singular and combined", () => {
    render(<ProductCard product={buildProduct({ creatorBuyerCount: 1, unitsSold: 20 })} />);
    expect(screen.getByText(/Worn by 1 creator/)).toBeInTheDocument();
    expect(screen.getByText(/20 bought/)).toBeInTheDocument();
  });

  it("shows only the units-sold line when no creators have worn it", () => {
    render(<ProductCard product={buildProduct({ creatorBuyerCount: 0, unitsSold: 5 })} />);
    expect(screen.getByText(/5 bought/)).toBeInTheDocument();
    expect(screen.queryByText(/Worn by/)).not.toBeInTheDocument();
  });

  it("renders a fallback illustration and swatch when there is no image", () => {
    const { container } = render(<ProductCard product={buildProduct()} />);
    expect(container.querySelector("svg.lucide-shirt")).toBeInTheDocument();
  });

  it("uses the product image as a background when present", () => {
    const { container } = render(
      <ProductCard product={buildProduct({ image: "https://cdn.example/x.jpg" })} />,
    );
    expect(container.querySelector("svg.lucide-shirt")).not.toBeInTheDocument();
  });
});
