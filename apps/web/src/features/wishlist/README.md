# wishlist

## Purpose

The `/wishlist` page and the save/unsave toggle used from product cards and the product detail page.

## Structure

- `api/wishlistApi.ts`, `wishlistSchemas.ts` — `save`/`unsave`/`list` calls and the response shapes.
- `hooks/useToggleWishlist.ts` — the save/unsave mutation. No cache patching of its own — see "Non-obvious rationale".
- `hooks/useInfiniteWishlist.ts` — cursor-paginated `["wishlist"]` query backing `WishlistGrid`.
- `components/WishlistGrid.tsx` — the `/wishlist` page's product grid.
- `wishlist.constants.ts` — the page size and any other shared constants.
- `index.ts` — barrel export; other features (`landing`'s `ProductCard`, `product-detail`) only ever import from here.

## Funnel

**User-facing:** tap the heart on a product card or the product detail page's Save button → it fills in immediately → the product appears on `/wishlist`; tap again to remove it.

**Technical:** `useToggleWishlist().mutate({ productId, saved })` → `POST`/`DELETE /api/wishlist/:productId` (see `apps/api/src/modules/wishlist/README.md`) → the consuming component's own local `useState` flips to match the result (or rolls back on error) → `/wishlist`'s own `useInfiniteWishlist` only reflects the change once it next fetches.

## Non-obvious rationale

**The save/unsave buttons on `ProductCard` and `ProductDetail` manage their own local `isSaved`/`saved` state rather than going through a shared cache-patching utility the way `explore`'s like/save/follow do (`feedCacheUpdate.ts`).** There's no single "product post" cache shape shared across a grid, a detail page, and a wishlist list the way a `FeedPost` is — a shop grid tile, a product detail page, and the wishlist's own list are three different query shapes with no natural single patch point. Each button owns an optimistic toggle, calls the mutation with an `onError` rollback, and otherwise trusts the local state until the page's own data next refetches. `ProductCard`/`ProductDetail` both now `disabled` the button while `useToggleWishlist().isPending`, matching the guard already on `explore`'s like/save/follow buttons, so a rapid double-tap can't fire two overlapping requests reading the same stale closure — the backend is also idempotent on its own (see the API module's README), so this was a duplicate-request/UI-consistency fix, not a data-integrity one.

**Most product listings never actually know a viewer's wishlist status.** `ProductCard`'s `isSaved` prop only ever reflects what's been toggled during the current page session — no shop grid, brand page, or home rail currently asks the backend for it, since only the single-product detail endpoint computes `isSaved` per viewer (see the API module's README for why). This isn't a caching bug; it's a feature gap in how far wishlist status is threaded through the product-browsing surfaces.
