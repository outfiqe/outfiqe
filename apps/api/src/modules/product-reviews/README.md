# product-reviews

## Purpose

Customer star ratings and written reviews on a `Product`, plus the denormalized rating summary
(`avgRating`, `reviewCount`, `rating{1-5}Count`) that lives on `Product` itself. Not real-time —
reads and writes go through the plain REST + react-query path the rest of the catalog uses, not
Socket.IO.

## Structure

- `product-review.constants.ts` — page size bounds, review body/title length bounds, image count
  cap, and the rate limits for posting a review and casting a helpful vote.
- `product-review.types.ts` — `ProductReviewRow` (repository-level Prisma shape) vs.
  `ProductReviewRecord` (the API-facing shape: `author` instead of a raw `user` relation, `images`
  flattened to `string[]`, `hasVotedHelpful` computed per viewer) — same row/record split as
  `creator-looks`.
- `product-review.schemas.ts` — Zod validation. `writeProductReviewSchema` is reused for both
  create and update (a full-replace `PATCH`, matching `creator-looks`' own look-edit convention)
  rather than a separate partial update schema. `rating`'s 1-5 bound is enforced here only — same
  as price/stock bounds on `Product` — not as a DB `CHECK` constraint.
- `product-review.utils.ts` — `toReviewRecord`: pure row → record mapping, no DB access.
- `product-review.repository.ts` — Prisma queries. `hasDeliveredPurchase` is the verified-purchase
  gate (see rationale below). `vote`/`unvote` mirror `creatorLook.repository.ts`'s
  `like`/`unlike` exactly: an idempotent `createMany({ skipDuplicates: true })`/`deleteMany` inside
  a transaction with the `helpfulCount` increment/decrement, so a duplicate vote request is a no-op
  rather than a unique-constraint error.
- `product-review.service.ts` — ownership/gate checks (`requireActiveProduct`,
  `requireOwnedReview`), the one-review-per-product-per-user conflict check, and the
  `productService.recomputeRatingSummary` call after every create/update/delete (see rationale).
  Publishes `DomainEvents.PRODUCT_REVIEWED` on create.
- `product-review.controller.ts` / `product-review.routes.ts` — mounted at
  `/api/products/:productId/reviews` (`Router({ mergeParams: true })`, so `req.params.productId`
  from the parent path segment reaches this module's own routes) rather than nested inside
  `products/product.routes.ts` — reviews are substantial enough (own repository/service/schemas) to
  be a real module, not a handful of routes bolted onto `product.controller.ts`.

## Funnel

**User-facing:** a signed-in customer who has received a delivered order for a product can post one
review (rating, optional title, body, up to `MAX_REVIEW_IMAGES` photos) on that product's page, and
can edit or delete it later. Other shoppers can sort/filter the list (newest, oldest, highest/lowest
rating, most helpful; optionally filtered to one star value) and mark another user's review as
helpful. An admin can delete any review. The product page's rating summary (average, count, 1-5
star bar breakdown) always reflects the current, non-deleted review set.

**Technical:** `POST /api/products/:productId/reviews` → `productReviewService.create` checks
`productReviewRepository.hasDeliveredPurchase` and the `(productId, userId)` uniqueness, inserts the
review + images, then calls `productService.recomputeRatingSummary(productId)` (owned by the
`products` module — see rationale) before publishing `PRODUCT_REVIEWED`. Listing
(`GET /api/products/:productId/reviews`) is cursor-paginated exactly like
`product.repository.ts`'s `listPublic`/`listByBrandId` (`cursor: { id }, skip: 1` against a
per-sort `orderBy`, not a hand-encoded cursor) since every sort still ends in a unique `id`
tie-breaker.

## Non-obvious rationale

**"Who can review" is gated to verified purchasers, not any authenticated user.** A review can only
be created for a product the reviewer has a `DELIVERED` `OrderItem` for
(`hasDeliveredPurchase` — order-level `fulfilmentStatus`, matching the same status
`product.repository.ts`'s own sales-stats query already trusts as "genuinely happened," not just
`PAID`). Because every review is therefore implicitly a verified purchase, there's no separate
`isVerifiedPurchase` boolean on the model — the badge is unconditional.

**The rating summary is recomputed from scratch on every write, not tracked as a running average.**
`productRepository.refreshRatingSummary` re-`groupBy`s the product's non-deleted reviews and
overwrites `avgRating`/`reviewCount`/`rating{1-5}Count` in one query, the same write-time-refresh
pattern `recountWornBy`/`updateWornByCount` already use for `Product.wornByCount` — cross-module
denormalized fields on `Product` are refreshed by calling back into `products`' own repository/
service, not written directly from this module's Prisma calls. A running increment/decrement (like
`CreatorLook.likeCount`) was deliberately not used here: it would drift the moment a review's
_rating_ changes on edit (an increment/decrement pair can keep a count correct, but not an average
computed from five separate buckets), whereas a full recompute from the bucket counts can't drift by
construction.

**The one-review-per-product-per-user check is a pre-check, not the real guarantee.**
`productReviewService.create`'s `findByProductAndUser` lookup is a fast path that gives most
duplicate-review attempts a clean `REVIEW_ALREADY_EXISTS` immediately, but two truly concurrent
submissions from the same user could both pass it. The real guarantee is the
`@@unique([productId, userId])` constraint on `ProductReview`; `create` catches the resulting
`P2002` via `isUniqueConstraintError` and maps it to the same `REVIEW_ALREADY_EXISTS` 409 rather
than letting a raw constraint error reach the client — the same pre-check-plus-DB-constraint-as-
final-authority shape `badges/badge.repository.ts`'s `awardBadge` already documents for the same
class of race.

**Moderation is admin-delete only — there's no user-facing "report" flow.** No report/flag system
exists anywhere else in this codebase (product listing moderation is admin approve/reject on the
listing itself, not a report queue) at the time this module was built, so one wasn't invented for
reviews either. `productReviewService.remove` allows the review's own author or `UserRole.ADMIN` —
enforced in the service, not the route, since a route-level `requireRole` can't express "owner OR
admin."
