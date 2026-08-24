# product-reviews

## Purpose

Renders and manages customer star ratings/reviews on a product's page: the rating summary (average,
count, star breakdown), the sortable/filterable review list, and the write/edit review form. Not
real-time — plain react-query fetch + invalidate, no socket.

## Structure

- `api/productReviewSchemas.ts` / `api/productReviewsApi.ts` — Zod-validated client for
  `/api/products/:productId/reviews`.
- `product-reviews.constants.ts` — `productReviewsQueryKey` (the shared query-key builder every
  hook here uses so a mutation's `invalidateQueries({ queryKey: ["product-reviews", productId] })`
  catches every sort/filter combination cached for that product), plus the image-count and
  min-body-length constants the write form enforces client-side (mirroring
  `apps/api/src/modules/product-reviews/product-review.constants.ts`, not the source of truth —
  the API still re-validates).
- `hooks/useProductReviews.ts` — `useInfiniteCursorPage` (`@outfiqe/hooks`) keyed by
  `(productId, sort, rating)`, same infinite-list pattern as
  `creator-profile/hooks/useInfiniteCreatorLooks.ts`.
- `hooks/useProductRatingSummary.ts` — a `useQuery` seeded with `initialData` from the
  server-rendered product detail page (see rationale below) so the rating summary never
  double-fetches on first paint, but can be invalidated after any review mutation.
- `hooks/useCreateProductReview.ts` / `useUpdateProductReview.ts` / `useDeleteProductReview.ts` /
  `useToggleReviewHelpful.ts` — one mutation hook per action, matching this codebase's
  `cart`/`wishlist` hook granularity. Each invalidates the reviews list and (except the helpful
  vote, which never changes the rating summary) the rating summary query.
- `components/RatingSummary.tsx` — the average + 5-bar breakdown; clicking a bar sets it as the
  active rating filter (click again to clear).
- `components/ReviewCard.tsx` — one review: author, stars, title/body, photos, helpful button,
  edit/delete (owner or `UserRole.ADMIN` only).
- `components/ReviewForm.tsx` — the write/edit modal. Reuses `@outfiqe/design-system`'s
  `ImageUploader` as-is (no cropping) — review photos are casual proof-of-purchase shots, not
  curated content, so the heavier crop-based picker `creator-dashboard`'s look composer uses would
  be the wrong tool here.
- `components/ReviewsSection.tsx` — composes all of the above, mounted at the bottom of
  `product-detail/components/ProductDetail.tsx` as `<section id="reviews">`.

## Funnel

**User-facing:** any shopper viewing a product scrolls to (or deep-links into, see rationale) the
Reviews section, sees the rating summary and can filter by star / change sort, and reads reviews
with photos. A signed-in shopper who doesn't have a review yet sees "Write a review"; submitting a
review they're not eligible for (`packages/client`'s `ApiClientError` surfaces the API's
`PURCHASE_REQUIRED` message via `getErrorMessage`) shows that reason as a toast rather than a
silent failure.

**Technical:** `ReviewsSection` reads `sort`/`rating` as component state (not the URL) and rebuilds
`useProductReviews`'s query key on change; `useInfiniteCursorPage` handles cursor pagination. Every
write mutation (`create`/`update`/`delete`/`toggleHelpful`) invalidates
`["product-reviews", productId]` (a query-key prefix match invalidates every cached sort/filter
combination at once) rather than hand-patching the cache — acceptable for a non-real-time surface
where a full refetch is cheap and correctness (recomputed rating summary, updated helpful counts)
matters more than shaving one network round trip.

## Non-obvious rationale

**`useProductRatingSummary` re-fetches the whole product detail endpoint (`productDetailApi.get`)
just to read 7 fields.** There's no dedicated "rating summary" endpoint — the product page is
server-rendered (`product-detail/api/getProductDetailServer.ts`) and already carries these fields
on `ProductDetail` (see `product-detail/api/productDetailSchemas.ts`'s
`productRatingSummarySchema`), so a first-paint fetch would be pure duplication. Refetching the full
product on invalidation (rather than adding a narrower endpoint) was the smaller surface for what's
a low-frequency event (posting/editing/deleting a review, not something a shopper does often).

**Deep-linking (`REVIEW_REQUESTED` notification → `/product/{id}?review=write#reviews`, see
`apps/api/src/modules/notifications/README.md`) opens the write form via a `review=write` query
param read in a `useEffect`, not the URL hash.** The `#reviews` fragment is left to the browser's
own native anchor-scroll (an `id="reviews"` section, no JS `scrollIntoView` needed) — only "should
the write form start open" needed application state, since native anchor scrolling can't also
trigger a modal.
