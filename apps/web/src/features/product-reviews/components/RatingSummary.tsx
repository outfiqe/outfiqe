"use client";

import { Rating } from "@outfiqe/design-system";

import type { ProductRatingSummary } from "@/features/product-detail/api/productDetailSchemas";

const STAR_LEVELS = [5, 4, 3, 2, 1] as const;

const countForStar = (
  { rating1Count, rating2Count, rating3Count, rating4Count, rating5Count }: ProductRatingSummary,
  star: (typeof STAR_LEVELS)[number],
): number => {
  switch (star) {
    case 5:
      return rating5Count;
    case 4:
      return rating4Count;
    case 3:
      return rating3Count;
    case 2:
      return rating2Count;
    case 1:
      return rating1Count;
  }
};

type RatingSummaryProps = {
  summary: ProductRatingSummary;
  selectedRating: number | undefined;
  onSelectRating: (rating: number | undefined) => void;
};

export const RatingSummary = ({ summary, selectedRating, onSelectRating }: RatingSummaryProps) => {
  const { avgRating, reviewCount } = summary;

  if (reviewCount === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet. Be the first to review.</p>;
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
      <div className="flex shrink-0 flex-col items-center gap-1 sm:items-start">
        <p className="font-display text-4xl font-extrabold text-foreground">
          {(avgRating ?? 0).toFixed(1)}
        </p>
        <Rating value={avgRating ?? 0} readOnly size="sm" />
        <p className="text-xs text-muted-foreground">
          {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
        </p>
      </div>

      <div className="flex-1 space-y-1.5">
        {STAR_LEVELS.map((star) => {
          const count = countForStar(summary, star);
          const percent = reviewCount > 0 ? Math.round((count / reviewCount) * 100) : 0;
          const isSelected = selectedRating === star;

          return (
            <button
              key={star}
              type="button"
              onClick={() => onSelectRating(isSelected ? undefined : star)}
              aria-pressed={isSelected}
              className="flex w-full items-center gap-2 rounded-md py-0.5 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="w-9 shrink-0">{star} star</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="w-8 shrink-0 text-right">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
