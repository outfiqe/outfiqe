import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ProductReview } from "../api/productReviewSchemas";
import { ReviewCard } from "./ReviewCard";

const buildReview = (overrides: Partial<ProductReview> = {}): ProductReview => ({
  id: "review-1",
  productId: "product-1",
  rating: 4,
  title: "Great fit",
  body: "Runs true to size.",
  helpfulCount: 3,
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  author: { id: "author-1", name: "Priya Shah", handle: "priya-shah", avatarUrl: null },
  images: [],
  hasVotedHelpful: false,
  ...overrides,
});

const renderCard = (
  overrides: Partial<ProductReview> = {},
  extra: Partial<Parameters<typeof ReviewCard>[0]> = {},
) =>
  render(
    <ReviewCard
      review={buildReview(overrides)}
      isOwn={false}
      canModerate={false}
      onToggleHelpful={vi.fn()}
      isTogglingHelpful={false}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      {...extra}
    />,
  );

describe("ReviewCard", () => {
  it("shows the author, verified badge, rating, and body", () => {
    renderCard();

    expect(screen.getByText("Priya Shah")).toBeInTheDocument();
    expect(screen.getByText("Verified purchase")).toBeInTheDocument();
    expect(screen.getByText("Great fit")).toBeInTheDocument();
    expect(screen.getByText("Runs true to size.")).toBeInTheDocument();
  });

  it("hides edit/delete for a review that isn't the viewer's own and they aren't a moderator", () => {
    renderCard();

    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("shows edit and delete for the review's own author, and calls the right handler", () => {
    const onDelete = vi.fn();
    renderCard({}, { isOwn: true, onDelete });

    expect(screen.getByText("Edit")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Delete"));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("shows delete but not edit for a moderator viewing someone else's review", () => {
    renderCard({}, { canModerate: true });

    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("disables the helpful button for the review's own author", () => {
    renderCard({}, { isOwn: true });

    expect(screen.getByRole("button", { name: /helpful/i })).toBeDisabled();
  });

  it("calls onToggleHelpful when a different viewer clicks the helpful button", () => {
    const onToggleHelpful = vi.fn();
    renderCard({}, { onToggleHelpful });

    fireEvent.click(screen.getByRole("button", { name: /helpful/i }));
    expect(onToggleHelpful).toHaveBeenCalledOnce();
  });
});
