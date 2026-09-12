# wishlist

## Purpose

A shopper's saved-for-later product list — save/unsave a product, list what's saved, paginated.

## Structure

- `wishlist.routes.ts` — `GET /`, `POST /:productId`, `DELETE /:productId`, all `requireAuth`.
- `wishlist.controller.ts` — thin request/response glue, no logic of its own.
- `wishlist.service.ts` — `save`/`unsave` (verify the product exists first, via `productRepository`), `list` (paginate + hydrate to `PublicProductPage`).
- `wishlist.repository.ts` — the `SavedProduct` join-table reads/writes, including the batched `listSavedProductIds` every product-listing endpoint elsewhere in the API uses (see `../products/README.md`'s `isSaved` section).
- `wishlist.schemas.ts`, `wishlist.types.ts` — request validation and the `WishlistResult`/list-query shapes.

## Funnel

**User-facing:** tap the heart icon on a product card or the product detail page → it fills in immediately → the product shows up on `/wishlist` (see `apps/web/src/features/wishlist`).

**Technical:** `POST/DELETE /api/wishlist/:productId` → `wishlistController.save`/`unsave` → `wishlistService` (confirms the product exists, throws `404` otherwise) → `wishlistRepository.save`/`unsave` → `SavedProduct` upsert/delete, wrapped in a transaction. `GET /api/wishlist` → `wishlistService.list` → `wishlistRepository.listSaved`/`count` → `toPublicProduct` per row.

## Non-obvious rationale

**`save`/`unsave` are wrapped in `prisma.$transaction`, checking `findUnique` before writing, so a duplicate call is a no-op rather than a unique-constraint error.** The `(userId, productId)` pair is a real DB unique constraint; two near-simultaneous requests for the same toggle (a rapid double-tap on the frontend, or a retried request) would otherwise race between the check and the write. `apps/web`'s wishlist buttons now also guard against the common trigger (`disabled` while `useToggleWishlist().isPending`, matching `explore`'s like/save/follow buttons), but the backend stays safe on its own regardless of what any particular client does.

**`listSavedProductIds` is the batched form `getPublicDetail`'s single-item `isSaved` couldn't reuse as-is.** `getPublicDetail` (the single-product page) always had real `isSaved`, via one `wishlistRepository.isSaved(viewerId, id)` call for that one viewer+product pair. Every _listing_ endpoint (`GET /products`, a brand's product list, the trending/new-arrivals rails) used to skip it entirely — doing the single-item check once per listed product would have meant a real N+1 cost across a shop grid, every brand page, and both home rails. `listSavedProductIds` is the fix: one `WHERE userId = ? AND productId IN (...)` per page instead, called from a shared `hydrateSavedFlags` helper in `product.service.ts` — see `../products/README.md`'s `isSaved` section for the full shape of that fix.
