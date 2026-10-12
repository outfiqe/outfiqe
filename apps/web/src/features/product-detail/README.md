# product-detail

## Purpose

A product's own page, `/product/[id]`: photos, price, size and quantity, Add to bag, Buy now, save, shipping and trust notes, the creators seen wearing it, and its reviews.

## Structure

- `components/ProductDetail.tsx` — the page. It holds the chosen size, quantity and photo, and runs Add to bag (`cart`'s `useAddToCart`), Buy now (saves a Buy Now payload with `checkout`'s `saveBuyNowPayload`, then opens `/checkout?buyNow=1`) and save (`wishlist`'s `useToggleWishlist`). A signed-out visitor is sent to sign in first.
- `components/SizeSelector.tsx`, `components/QuantitySelector.tsx` — the size and quantity pickers.
- `components/ThriftPurchaseConfirmModal.tsx` — "You're buying a secondhand piece": asked once before the first Add to bag or Buy now on a thrift piece.
- `components/SeenOnCreators.tsx` — the looks that tagged this product; opening one records the click (`useRecordSeenOnClick`).
- `components/ShippingInfo.tsx`, `components/TrustLine.tsx` — delivery and trust notes.
- `api/getProductDetailServer.ts` — the server fetch for the page's first render and metadata; returns `null` on failure so the route can show "not found".
- `api/productDetailApi.ts`, `api/productDetailSchemas.ts` — the client calls (the product, and recording a "seen on" click) and the `ProductDetail` shape.
- `hooks/useRecordSeenOnClick.ts` — fire-and-forget record of a click on a creator look that tagged this product.
- `index.ts` — what `app/product/[id]/page.tsx` imports.

## Funnel

**User-facing:** a shopper opens a product from a grid or a look → flips through its photos, picks a size and quantity → presses Add to bag (a toast confirms) or Buy now (straight to checkout with just this piece). A thrift piece asks them to confirm it's secondhand first. Below, they can open the looks it was seen in and read its reviews.

**Technical:** `app/product/[id]/page.tsx` → `getProductDetailServer` → `GET /api/products/:id` (with the viewer's access token) → metadata, JSON-LD and `ProductDetail`. Add to bag → `useAddToCart` → `POST /api/cart/items`. Buy now → `saveBuyNowPayload` (session storage) → `/checkout?buyNow=1` (see `checkout/README.md`). A "seen on" click → `POST /api/creator-looks/:lookId/tags/:productId/click`. Reviews come from `product-reviews`' `ReviewsSection`.

## Non-obvious rationale

**The server fetch sends the viewer's access token.** The product carries a per-viewer `isSaved`, so the first render has to be fetched as that viewer, or the heart would show the wrong state until the browser refetched.
