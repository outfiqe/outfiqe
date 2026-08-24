# product-reviews

## Purpose

Admin moderation for customer product reviews: search a product, browse its reviews, and delete
anything that shouldn't be up. There is no cross-product "all reviews" queue — see rationale below.

## Structure

- `schemas.ts` / `api.ts` — thin client for two existing, already-public API endpoints
  (`GET /products/autocomplete`, used for the product search box) and the review endpoints
  (`GET`/`DELETE /products/:productId/reviews[/​:reviewId]`) — no admin-only backend route was
  added for this page.
- `ProductReviewsPage.tsx` — the whole feature in one component: a debounced product search, then
  the selected product's review list with a delete button per row.

## Funnel

**User-facing:** an admin opens Product Reviews, types a product name, picks it from the search
results, and sees that product's reviews (newest first). Deleting a review removes it immediately;
the product's rating summary (average/count/breakdown, shown on the storefront) is recomputed by
the API's own `product-reviews` module as a side effect of the delete — this page doesn't do that
itself.

**Technical:** product search calls the same `/products/autocomplete` endpoint the storefront's own
search box uses (public, no admin-only variant needed). Selecting a product fetches
`GET /products/:id/reviews?sort=newest` with the admin's own auth token — the route only requires
`optionalAuth`, so this works without any admin-specific query parameter; deleting a review is
`DELETE /products/:id/reviews/:reviewId`, which `product-review.service.ts`'s `remove` allows for
`UserRole.ADMIN` regardless of who authored the review (see
`apps/api/src/modules/product-reviews/README.md`).

## Non-obvious rationale

**There's no cross-product "all reviews awaiting moderation" list, unlike the products approval
queue (`GET /products/review`, `ProductsPage.tsx`).** Product listings have a real queue because
every new listing needs a human decision before it's ever public (`PENDING` → `APPROVED`/
`REJECTED`). Reviews are the opposite: they're live the moment they're posted (no pre-moderation
queue exists or was asked for — see the "Moderation" decision in the review system's design), so
there's nothing to triage in bulk, only something to look up and act on when a specific review is
flagged (e.g., reported to support outside this app). A search-then-moderate flow fits that shape
better than a queue with nothing reliable to sort it by.
