"use client";

import { Button, Modal, Select, Skeleton, toast } from "@outfiqe/design-system";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/features/auth/context/AuthContext";
import { UserRole } from "@/features/auth/types";
import type { ProductRatingSummary } from "@/features/product-detail/api/productDetailSchemas";
import { getErrorMessage } from "@/shared/lib/errorMessages";

import type { WriteProductReviewInput } from "../api/productReviewsApi";
import type { ProductReview, ReviewSort } from "../api/productReviewSchemas";
import { useCreateProductReview } from "../hooks/useCreateProductReview";
import { useDeleteProductReview } from "../hooks/useDeleteProductReview";
import { useProductRatingSummary } from "../hooks/useProductRatingSummary";
import { useProductReviews } from "../hooks/useProductReviews";
import { useToggleReviewHelpful } from "../hooks/useToggleReviewHelpful";
import { useUpdateProductReview } from "../hooks/useUpdateProductReview";
import { RatingSummary } from "./RatingSummary";
import { ReviewCard } from "./ReviewCard";
import { ReviewForm } from "./ReviewForm";

const SORT_OPTIONS: { value: ReviewSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "highest_rating", label: "Highest rating" },
  { value: "lowest_rating", label: "Lowest rating" },
  { value: "most_helpful", label: "Most helpful" },
];

const WRITE_REVIEW_PARAM = "review";

type ReviewsSectionProps = {
  productId: string;
  initialRatingSummary: ProductRatingSummary;
};

export const ReviewsSection = ({ productId, initialRatingSummary }: ReviewsSectionProps) => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { state, isAuthenticated } = useAuth();
  const currentUser = state.user;
  const currentUserId = currentUser?.id;

  const [sort, setSort] = useState<ReviewSort>("newest");
  const [ratingFilter, setRatingFilter] = useState<number | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ProductReview | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  const openedFromDeepLink = searchParams.get(WRITE_REVIEW_PARAM) === "write";
  const isFormOpen = formOpen || openedFromDeepLink;

  const closeForm = () => {
    setFormOpen(false);
    setEditingReview(null);
    if (openedFromDeepLink) {
      const params = new URLSearchParams(searchParams);
      params.delete(WRITE_REVIEW_PARAM);
      router.replace(`?${params.toString()}`, { scroll: false });
    }
  };

  const { data: ratingSummary } = useProductRatingSummary(productId, initialRatingSummary);
  const { reviewCount } = ratingSummary;
  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useProductReviews(
    productId,
    sort,
    ratingFilter,
  );
  const reviews = data?.pages.flatMap((page) => page.reviews) ?? [];

  const createReview = useCreateProductReview(productId);
  const updateReview = useUpdateProductReview(productId);
  const deleteReview = useDeleteProductReview(productId);
  const toggleHelpful = useToggleReviewHelpful(productId);

  const myReview = reviews.find((review) => review.author.id === currentUserId);
  const canModerate = currentUser?.role === UserRole.ADMIN;

  const openWriteForm = () => {
    if (!isAuthenticated) return;
    setEditingReview(null);
    setFormOpen(true);
  };

  const submitReview = async (input: WriteProductReviewInput) => {
    if (editingReview) {
      await updateReview.mutateAsync({ reviewId: editingReview.id, input });
      toast.success("Review updated.");
      return;
    }
    await createReview.mutateAsync(input);
    toast.success("Review posted.");
  };

  let reviewFormInitialValues: WriteProductReviewInput | undefined;
  if (editingReview) {
    const { rating, title, body, images } = editingReview;
    reviewFormInitialValues = { rating, title: title ?? "", body, imageUrls: images };
  }

  const confirmDelete = () => {
    if (!deletingReviewId) return;
    deleteReview.mutate(deletingReviewId, {
      onSuccess: () => {
        setDeletingReviewId(null);
        toast.success("Review deleted.");
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  };

  return (
    <section id="reviews" className="mt-14 border-t border-border pt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-tight text-foreground">
          Reviews
        </h2>
        {!myReview && (
          <Button variant="outline" onClick={openWriteForm} disabled={!isAuthenticated}>
            Write a review
          </Button>
        )}
      </div>

      <div className="mt-5">
        <RatingSummary
          summary={ratingSummary}
          selectedRating={ratingFilter}
          onSelectRating={setRatingFilter}
        />
      </div>

      {reviewCount > 0 && (
        <div className="mt-6 flex items-center justify-end">
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value as ReviewSort)}
            className="w-auto"
            aria-label="Sort reviews"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="mt-2">
        {isLoading && (
          <div className="space-y-2 py-6" role="status" aria-label="Loading reviews">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        )}

        {!isLoading && reviews.length === 0 && reviewCount > 0 && (
          <p className="py-6 text-sm text-muted-foreground">No reviews match this filter.</p>
        )}

        {reviews.map((review) => {
          const { id, author, hasVotedHelpful } = review;

          return (
            <ReviewCard
              key={id}
              review={review}
              isOwn={author.id === currentUserId}
              canModerate={canModerate}
              onToggleHelpful={() => toggleHelpful.mutate({ reviewId: id, hasVotedHelpful })}
              isTogglingHelpful={toggleHelpful.isPending}
              onEdit={() => {
                setEditingReview(review);
                setFormOpen(true);
              }}
              onDelete={() => setDeletingReviewId(id)}
            />
          );
        })}

        {hasNextPage && (
          <div className="flex justify-center py-4">
            <Button
              variant="outline"
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading…" : "Load more reviews"}
            </Button>
          </div>
        )}
      </div>

      <ReviewForm
        open={isFormOpen}
        onClose={closeForm}
        onSubmit={submitReview}
        isSubmitting={createReview.isPending || updateReview.isPending}
        initialValues={reviewFormInitialValues}
      />

      <Modal
        open={deletingReviewId !== null}
        onClose={() => setDeletingReviewId(null)}
        title="Delete review?"
        description="This can't be undone."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeletingReviewId(null)}>
              Cancel
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={deleteReview.isPending}
              className="border border-destructive bg-transparent text-destructive hover:bg-destructive hover:text-white"
            >
              {deleteReview.isPending ? "Deleting…" : "Delete"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">This review will be removed permanently.</p>
      </Modal>
    </section>
  );
};
