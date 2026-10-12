import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FittingProduct } from "../api/fittingProductsApi";
import { FitFinder } from "./FitFinder";

const replaceRoute = vi.fn();
const refetch = vi.fn();
let currentSearchParams = new URLSearchParams();
let isSizeFitOn = true;

type FittingResultsState = {
  data: { pages: { products: FittingProduct[]; total: number; nextCursor: null }[] } | undefined;
  isLoading: boolean;
  isError: boolean;
};

let fittingResults: FittingResultsState;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceRoute }),
  useSearchParams: () => currentSearchParams,
}));

vi.mock("@/shared/hooks/useFeatureFlag", () => ({
  useFeatureFlag: () => isSizeFitOn,
}));

vi.mock("@/features/products/hooks/useProductTypes", () => ({
  useProductTypes: () => ({
    data: [
      { id: "type-kurta", slug: "kurta-set", label: "Kurta set", supportsFitRanges: true },
      { id: "type-bags", slug: "bags", label: "Bags", supportsFitRanges: false },
    ],
  }),
}));

vi.mock("@/features/landing/components/ProductCard", () => ({
  ProductCard: ({ product }: { product: { name: string } }) => <p>{product.name}</p>,
}));

vi.mock("../hooks/useShopperMeasurements", () => ({
  useShopperMeasurements: () => null,
}));

vi.mock("../hooks/useInfiniteFittingProducts", () => ({
  useInfiniteFittingProducts: () => ({
    ...fittingResults,
    refetch,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  }),
}));

const fittingProduct = (name: string, sizeLabel: string): FittingProduct => ({
  id: `product-${name}`,
  brand: "Kastha",
  name,
  price: 2_000,
  effectivePrice: 2_000,
  discountPercent: null,
  type: "kurta-set",
  categorySlugs: [],
  imageUrl: null,
  image: null,
  lowStock: false,
  isNew: false,
  isSaved: false,
  isThrift: false,
  thriftConditionRating: null,
  thriftConditionNotes: null,
  isSoldOut: false,
  creatorBuyerCount: 0,
  unitsSold: 0,
  avgRating: null,
  reviewCount: 0,
  recommendedSize: { sizeId: `size-${sizeLabel}`, label: sizeLabel },
});

const resultsOf = (products: FittingProduct[]): FittingResultsState => ({
  data: { pages: [{ products, total: products.length, nextCursor: null }] },
  isLoading: false,
  isError: false,
});

beforeEach(() => {
  replaceRoute.mockReset();
  refetch.mockReset();
  isSizeFitOn = true;
  currentSearchParams = new URLSearchParams();
  fittingResults = { data: undefined, isLoading: false, isError: false };
});

afterEach(() => {
  window.localStorage.clear();
});

describe("FitFinder", () => {
  it("says the page isn't open while size_fit is off", () => {
    isSizeFitOn = false;
    render(<FitFinder />);

    expect(screen.getByText(/isn't open yet/)).toBeInTheDocument();
  });

  it("asks for measurements, then puts them in the link and remembers them", async () => {
    render(<FitFinder />);

    expect(screen.getByText(/Enter your height and weight to see every piece/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Height (cm)"), "165");
    await userEvent.type(screen.getByLabelText("Weight (kg)"), "60");
    await userEvent.click(screen.getByRole("button", { name: "Show what fits" }));

    expect(replaceRoute).toHaveBeenCalledWith("/fit?heightCm=165&weightKg=60", { scroll: false });
    expect(window.localStorage.getItem("outfiqe.fit-measurements")).toBe(
      JSON.stringify({ heightCm: 165, weightKg: 60 }),
    );
  });

  it("explains measurements outside the bounds", async () => {
    render(<FitFinder />);

    await userEvent.type(screen.getByLabelText("Height (cm)"), "20");
    await userEvent.type(screen.getByLabelText("Weight (kg)"), "60");
    await userEvent.click(screen.getByRole("button", { name: "Show what fits" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a height from 50 to 230 cm");
    expect(replaceRoute).not.toHaveBeenCalled();
  });

  it("lists what fits with each product's size and filters by kind of clothing", async () => {
    currentSearchParams = new URLSearchParams({ heightCm: "165", weightKg: "60" });
    fittingResults = resultsOf([
      fittingProduct("Linen Kurta", "M"),
      fittingProduct("Silk Kurta", "L"),
    ]);
    render(<FitFinder />);

    expect(screen.getByText("2 pieces fit you")).toBeInTheDocument();
    expect(screen.getByText("Your size: M")).toBeInTheDocument();
    expect(screen.getByText("Your size: L")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bags" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Kurta set" }));
    expect(replaceRoute).toHaveBeenCalledWith("/fit?heightCm=165&weightKg=60&type=kurta-set", {
      scroll: false,
    });
  });

  it("says when nothing in stock fits", () => {
    currentSearchParams = new URLSearchParams({ heightCm: "200", weightKg: "120" });
    fittingResults = resultsOf([]);
    render(<FitFinder />);

    expect(
      screen.getByText("Nothing in stock is cut for 200 cm and 120 kg yet."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse everything" })).toHaveAttribute(
      "href",
      "/shop",
    );
  });

  it("offers a retry when results fail to load", async () => {
    currentSearchParams = new URLSearchParams({ heightCm: "165", weightKg: "60" });
    fittingResults = { data: undefined, isLoading: false, isError: true };
    render(<FitFinder />);

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
  });

  it("shows a loading grid while results load", () => {
    currentSearchParams = new URLSearchParams({ heightCm: "165", weightKg: "60" });
    fittingResults = { data: undefined, isLoading: true, isError: false };
    render(<FitFinder />);

    expect(screen.getByRole("status", { name: "Loading products" })).toBeInTheDocument();
  });
});
