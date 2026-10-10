import { createFileRoute } from "@tanstack/react-router";

import { ProductReviewsPage } from "@/features/product-reviews/components/ProductReviewsPage";

export const Route = createFileRoute("/_authenticated/product-reviews")({
  component: ProductReviewsPage,
});
