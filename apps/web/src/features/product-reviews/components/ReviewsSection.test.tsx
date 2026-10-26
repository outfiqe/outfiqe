import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ProductRatingSummary } from "@/features/product-detail/api/productDetailSchemas";

import type { ProductReview } from "../api/productReviewSchemas";
import { ReviewsSection } from "./ReviewsSection";

const OTHER_SHOPPER_REVIEW: ProductReview = {
  id: "review-1",
  productId: "product-1",
  rating: 5,
  title: null,
  body: "This was a really good fit.",
  helpfulCount: 2,
  createdAt: "2026-10-26T00:00:00.000Z",
  updatedAt: "2026-10-26T00:00:00.000Z",
  author: { id: "author-1", name: "Anjesh Ghimire", handle: "anjesh", avatarUrl: null },
  images: [],
  hasVotedHelpful: false,
};

const RATING_SUMMARY: ProductRatingSummary = {
  avgRating: 5,
  reviewCount: 1,
  rating1Count: 0,
  rating2Count: 0,
  rating3Count: 0,
  rating4Count: 0,
  rating5Count: 1,
};

type FakeViewer = { id: string; role: string } | null;

const authState: {
  state: { user: FakeViewer };
  isAuthenticated: boolean;
  isAuthResolved: boolean;
  isShopper: boolean;
} = {
  state: { user: { id: "viewer-1", role: "CUSTOMER" } },
  isAuthenticated: true,
  isAuthResolved: true,
  isShopper: true,
};

const searchParamsState = { query: "" };

vi.mock("@/features/auth/context/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(searchParamsState.query),
}));

const idleMutation = { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false };

vi.mock("../hooks/useCreateProductReview", () => ({ useCreateProductReview: () => idleMutation }));
vi.mock("../hooks/useUpdateProductReview", () => ({ useUpdateProductReview: () => idleMutation }));
vi.mock("../hooks/useDeleteProductReview", () => ({ useDeleteProductReview: () => idleMutation }));
vi.mock("../hooks/useToggleReviewHelpful", () => ({ useToggleReviewHelpful: () => idleMutation }));
vi.mock("../hooks/useProductRatingSummary", () => ({
  useProductRatingSummary: () => ({ data: RATING_SUMMARY }),
}));
vi.mock("../hooks/useProductReviews", () => ({
  useProductReviews: () => ({
    data: { pages: [{ reviews: [OTHER_SHOPPER_REVIEW] }] },
    isLoading: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  }),
}));
vi.mock("./ReviewForm", () => ({
  ReviewForm: ({ open }: { open: boolean }) => (open ? <div>Review form open</div> : null),
}));

const renderSection = () =>
  render(<ReviewsSection productId="product-1" initialRatingSummary={RATING_SUMMARY} />);

const signInAs = (role: string, isShopper: boolean) => {
  authState.state = { user: { id: "viewer-1", role } };
  authState.isAuthenticated = true;
  authState.isAuthResolved = true;
  authState.isShopper = isShopper;
};

describe("ReviewsSection", () => {
  beforeEach(() => {
    signInAs("CUSTOMER", true);
    searchParamsState.query = "";
  });

  it("lets a shopper write a review and vote another review helpful", () => {
    renderSection();

    expect(screen.getByRole("button", { name: "Write a review" })).toBeEnabled();
    expect(screen.getByRole("button", { name: /helpful/i })).toBeEnabled();
  });

  it.each(["BRAND_OWNER", "ADMIN", "TENANT_STAFF", "RIDER"])(
    "hides writing and helpful voting from a %s account, which can't buy",
    (nonShopperRole) => {
      signInAs(nonShopperRole, false);
      renderSection();

      expect(screen.queryByRole("button", { name: "Write a review" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /helpful/i })).not.toBeInTheDocument();
      expect(screen.getByText("2 found this helpful")).toBeInTheDocument();
    },
  );

  it("doesn't open the review form from the write-review link for a brand owner", () => {
    signInAs("BRAND_OWNER", false);
    searchParamsState.query = "review=write";
    renderSection();

    expect(screen.queryByText("Review form open")).not.toBeInTheDocument();
  });

  it("opens the review form from the write-review link for a shopper", () => {
    searchParamsState.query = "review=write";
    renderSection();

    expect(screen.getByText("Review form open")).toBeInTheDocument();
  });

  it("shows a disabled write button to a signed-out visitor", () => {
    authState.state = { user: null };
    authState.isAuthenticated = false;
    authState.isShopper = false;
    renderSection();

    expect(screen.getByRole("button", { name: "Write a review" })).toBeDisabled();
  });

  it("holds back the write button until sign-in has been checked", () => {
    authState.isAuthResolved = false;
    renderSection();

    expect(screen.queryByRole("button", { name: "Write a review" })).not.toBeInTheDocument();
  });
});
