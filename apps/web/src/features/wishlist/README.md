# wishlist

## Purpose

The `/wishlist` page and the save/unsave toggle used from product cards and the product detail page.

## Structure

- `api/wishlistApi.ts`, `wishlistSchemas.ts` — `save`/`unsave`/`list` calls and the response shapes.
- `hooks/useToggleWishlist.ts` — the save/unsave mutation. On success it invalidates every cached product list that carries `isSaved` (`STASH_STATE_PRODUCT_QUERY_ROOTS`), so no list keeps showing the old state. See "Non-obvious rationale".
- `hooks/useInfiniteWishlist.ts` — cursor-paginated `["wishlist"]` query backing `WishlistGrid`.
- `components/WishlistGrid.tsx` — the `/wishlist` page's product grid.
- `wishlist.constants.ts` — the page size and any other shared constants, including `STASH_STATE_PRODUCT_QUERY_ROOTS` (`products`, `brand-products`, `collection-products`, `wishlist`): the query roots whose data includes a product's `isSaved`. A new product list that shows the stash button needs its root added here.
- `index.ts` — barrel export; other features (`landing`'s `ProductCard`, `product-detail`) only ever import from here.

## Funnel

**User-facing:** tap the heart on a product card or the product detail page's Save button → it fills in immediately → the product appears on `/wishlist`; tap again to remove it.

**Technical:** `useToggleWishlist().mutate({ productId, saved })` → `POST`/`DELETE /api/wishlist/:productId` (see `apps/api/src/modules/wishlist/README.md`) → the consuming component's own local `useState` flips immediately (or rolls back on error) → on success every query under `STASH_STATE_PRODUCT_QUERY_ROOTS` is invalidated: lists on screen refetch in the background, and lists off screen refetch the next time they're shown.

## Non-obvious rationale

**The save/unsave buttons on `ProductCard` and `ProductDetail` manage their own local `isSaved`/`saved` state rather than going through a shared cache-patching utility the way `explore`'s like/save/follow do (`feedCacheUpdate.ts`).** There's no single "product post" cache shape shared across a grid, a detail page, and a wishlist list the way a `FeedPost` is — a shop grid tile, a product detail page, and the wishlist's own list are three different query shapes with no natural single patch point. Each button owns an optimistic toggle and calls the mutation with an `onError` rollback. Instead of patching each shape, the mutation invalidates every product-list root on success. Before it did, a card re-created from a cached list read the stale `isSaved`: switching a brand page's type filter and back, returning to a page, or reloading (the offline cache restores `products`/`brand-products` from the device, and it counts as fresh for the 30s stale time) all undid the stash on screen, and the next tap sent the opposite of what the user saw. `onSuccess` returns the invalidation promise, so the button stays disabled until the lists on screen have refetched and a second tap can't race that refetch. `ProductCard`/`ProductDetail` both now `disabled` the button while `useToggleWishlist().isPending`, matching the guard already on `explore`'s like/save/follow buttons, so a rapid double-tap can't fire two overlapping requests reading the same stale closure — the backend is also idempotent on its own (see the API module's README), so this was a duplicate-request/UI-consistency fix, not a data-integrity one.

**The heart/Save button stays visible but disabled, with a `Tooltip`, for a platform admin viewer — it isn't hidden outright.** The backend rejects an admin's save with a 403 (`apps/api/src/modules/wishlist/README.md`); `STAFF_CANNOT_SAVE_PRODUCT_MESSAGE` (`wishlist.constants.ts`) is the one copy of that explanation, imported by both `ProductCard` and `ProductDetail` rather than each inlining its own string. This deliberately differs from `explore`'s treatment of an admin's follow button, which is hidden entirely — a wishlist save is a lower-stakes, more easily-explained restriction than a hard-blocked social action, so showing a tooltip costs nothing and avoids a bare, unexplained gap where the heart icon used to be.

**`ProductCard`/`ProductDetail` adjust their local `saved`/`isSaved` state during render, not in a `useEffect`, when the `isSaved` prop changes underneath them.** Every product-listing endpoint now sends a real, batched `isSaved` (see `apps/api/src/modules/products/README.md`'s `isSaved` section) — but a component that stays mounted across a refetch (pagination settling, a revisit, React Query's own background refresh) still needs its local optimistic-toggle state to pick that fresh value up, not just whatever it first mounted with. The fix is the pattern React's own docs recommend over an effect for "adjust state when a prop changes": track the last-seen prop value in a second piece of state, and if it no longer matches the current prop, call `setState` directly during the render itself (`if (isSaved !== lastSeenIsSaved) { setLastSeenIsSaved(isSaved); setSaved(isSaved); }`) — React re-renders once more before committing, so there's no extra effect pass and no flash of stale content. CLAUDE.md's "avoid unnecessary `useEffect`" rule applies here precisely because an effect-based resync would work but costs a whole extra commit-then-effect-then-re-render cycle for something render-time state adjustment does in one pass.
