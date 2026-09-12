# wishlist

## Purpose

A shopper's saved-for-later product list — save/unsave a product, list what's saved, paginated.

## Structure

- `wishlist.routes.ts` — `GET /`, `POST /:productId`, `DELETE /:productId`, all `requireAuth`.
- `wishlist.controller.ts` — thin request/response glue, no logic of its own.
- `wishlist.service.ts` — `save`/`unsave` (verify the product exists first, via `productRepository`), `list` (paginate + hydrate to `PublicProductPage`).
- `wishlist.repository.ts` — the `SavedProduct` join-table reads/writes.
- `wishlist.schemas.ts`, `wishlist.types.ts` — request validation and the `WishlistResult`/list-query shapes.

## Funnel

**User-facing:** tap the heart icon on a product card or the product detail page → it fills in immediately → the product shows up on `/wishlist` (see `apps/web/src/features/wishlist`).

**Technical:** `POST/DELETE /api/wishlist/:productId` → `wishlistController.save`/`unsave` → `wishlistService` (confirms the product exists, throws `404` otherwise) → `wishlistRepository.save`/`unsave` → `SavedProduct` upsert/delete, wrapped in a transaction. `GET /api/wishlist` → `wishlistService.list` → `wishlistRepository.listSaved`/`count` → `toPublicProduct` per row.

## Non-obvious rationale

**`save`/`unsave` are wrapped in `prisma.$transaction`, checking `findUnique` before writing, so a duplicate call is a no-op rather than a unique-constraint error.** The `(userId, productId)` pair is a real DB unique constraint; two near-simultaneous requests for the same toggle (a rapid double-tap on the frontend, or a retried request) would otherwise race between the check and the write. `apps/web`'s wishlist buttons now also guard against the common trigger (`disabled` while `useToggleWishlist().isPending`, matching `explore`'s like/save/follow buttons), but the backend stays safe on its own regardless of what any particular client does.

**Product listing endpoints (`GET /products`, a brand's product list, etc.) do not include `isSaved`.** Only `GET /products/:id` (the single-product detail page, via `product.service.ts`'s `getPublicDetail`) computes it, with one `wishlistRepository.isSaved` call for that one viewer+product pair. Doing the same for a list endpoint would mean an extra per-viewer wishlist check for every listed product on every page load — a real N+1 cost across `apps/web`'s shop grid, brand pages, and home rails, none of which currently pay it. `apps/web/src/features/landing/components/ProductCard`'s `isSaved` prop is consequently never populated by any listing view today; the heart there only reflects what a viewer has clicked during the current page's session, not their real wishlist status, until a batched per-list-of-ids check is added deliberately.
