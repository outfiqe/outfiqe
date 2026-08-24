import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProductRatingSummary } from "@/features/product-detail/api/productDetailSchemas";

import { RatingSummary } from "./RatingSummary";

const buildSummary = (overrides: Partial<ProductRatingSummary> = {}): ProductRatingSummary => ({
  avgRating: 4.2,
  reviewCount: 10,
  rating1Count: 1,
  rating2Count: 0,
  rating3Count: 1,
  rating4Count: 3,
  rating5Count: 5,
  ...overrides,
});

describe("RatingSummary", () => {
  it("shows an empty state and no bars when there are no reviews yet", () => {
    render(
      <RatingSummary
        summary={buildSummary({ reviewCount: 0, avgRating: null })}
        selectedRating={undefined}
        onSelectRating={vi.fn()}
      />,
    );

    expect(screen.getByText("No reviews yet. Be the first to review.")).toBeInTheDocument();
    expect(screen.queryByText("5 star")).not.toBeInTheDocument();
  });

  it("renders the average, review count, and a bar per star level", () => {
    render(
      <RatingSummary
        summary={buildSummary()}
        selectedRating={undefined}
        onSelectRating={vi.fn()}
      />,
    );

    expect(screen.getByText("4.2")).toBeInTheDocument();
    expect(screen.getByText("10 reviews")).toBeInTheDocument();
    expect(screen.getByText("5 star")).toBeInTheDocument();
    expect(screen.getByText("1 star")).toBeInTheDocument();
  });

  it("toggles the rating filter on click and clears it on a second click", () => {
    const onSelectRating = vi.fn();
    const { rerender } = render(
      <RatingSummary
        summary={buildSummary()}
        selectedRating={undefined}
        onSelectRating={onSelectRating}
      />,
    );

    fireEvent.click(screen.getByText("5 star"));
    expect(onSelectRating).toHaveBeenCalledWith(5);

    rerender(
      <RatingSummary summary={buildSummary()} selectedRating={5} onSelectRating={onSelectRating} />,
    );
    fireEvent.click(screen.getByText("5 star"));
    expect(onSelectRating).toHaveBeenCalledWith(undefined);
  });
});
