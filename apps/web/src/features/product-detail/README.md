# product-detail

## Purpose

A product's own page, `/product/[id]`: photos, price, size and quantity, Add to bag, Buy now, save, shipping and trust notes, the creators seen wearing it, and its reviews.

## Structure

- `components/ProductDetail.tsx` — the page. It holds the chosen size, quantity and photo, and runs Add to bag (`cart`'s `useAddToCart`), Buy now (saves a Buy Now payload with `checkout`'s `saveBuyNowPayload`, then opens `/checkout?buyNow=1`) and save (`wishlist`'s `useToggleWishlist`). A signed-out visitor is sent to sign in first. It sends `product:detail_view` once per product (brand, price paid, thrift flag) through `analytics`' `useTrackView`.
- `components/SizeSelector.tsx`, `components/QuantitySelector.tsx` — the size and quantity pickers.
  Brand and staff accounts can't buy, so for them both are disabled: the sizes stay visible as
  information, next to the "Shopping is available on customer accounts" note.
- `components/ThriftPurchaseConfirmModal.tsx` — "You're buying a secondhand piece": asked once before the first Add to bag or Buy now on a thrift piece.
- `components/SeenOnCreators.tsx` — the looks that tagged this product; opening one records the click (`useRecordSeenOnClick`).
- `components/ShippingInfo.tsx`, `components/TrustLine.tsx` — delivery and trust notes. The delivery line reads "Delivery from Rs. X" (the cheapest zone, via `utils/summarizeDeliveryFees.ts`) plus "Free above Rs. Y" only when every zone shares that threshold. It never names a zone: the product page doesn't know the shopper's city, and the default zone's name ("Default zone") is an admin label for "everywhere else", not a place. Checkout shows the exact fee once a city is chosen.
- `api/getProductDetailServer.ts` — the server fetch for the page's first render and metadata; returns `null` on failure so the route can show "not found".
- `api/productDetailApi.ts`, `api/productDetailSchemas.ts` — the client calls (the product, and recording a "seen on" click) and the `ProductDetail` shape.
- `hooks/useRecordSeenOnClick.ts` — fire-and-forget record of a click on a creator look that tagged this product.
- `index.ts` — what `app/product/[id]/page.tsx` imports.

## Funnel

**User-facing:** a shopper opens a product from a grid or a look → flips through its photos, picks a size and quantity → presses Add to bag (a toast confirms) or Buy now (straight to checkout with just this piece). A thrift piece asks them to confirm it's secondhand first. Below, they can open the looks it was seen in and read its reviews.

**Technical:** `app/product/[id]/page.tsx` → `getProductDetailServer` → `GET /api/products/:id` (with the viewer's access token) → metadata, JSON-LD and `ProductDetail`. Add to bag → `useAddToCart` → `POST /api/cart/items`. Buy now → `saveBuyNowPayload` (session storage) → `/checkout?buyNow=1` (see `checkout/README.md`). A "seen on" click → `POST /api/creator-looks/:lookId/tags/:productId/click`. Reviews come from `product-reviews`' `ReviewsSection`.

## Non-obvious rationale

**The page grid has an explicit `grid-cols-1` and the action row wraps.** Without a column template on phones, the single grid column grows to fit its widest row; the buy row (Add to bag, Buy now, Stash, Share) needs about 357px, so the page was 378px wide on a 360px phone. The buy buttons and the icon buttons are separate groups, so on narrow screens the icons drop to their own line instead of pushing the page wider.

**No size is chosen for the shopper unless only one is in stock.** Pre-selecting the first in-stock size (usually the smallest) let a shopper tap Buy now without ever choosing, and get XS. Add to bag and Buy now stay enabled so the buttons never look broken; tapping one without a size shows "Select a size to continue." (announced as an alert), outlines the sizes and moves focus to the first one in stock.

**The server fetch sends the viewer's access token.** The product carries a per-viewer `isSaved`, so the first render has to be fetched as that viewer, or the heart would show the wrong state until the browser refetched.
