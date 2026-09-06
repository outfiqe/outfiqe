# Checkout

## Purpose

The delivery-details-and-payment-method form that turns a cart (or, since Buy Now, a single item) into an order.

## Structure

- `components/CheckoutBody.tsx` — the page's top-level gate: resolves auth, loads the cart (or a Buy Now payload), and picks which state to render.
- `components/CheckoutForm.tsx` / `CheckoutSummary.tsx` / `PaymentMethodField.tsx` — the address + payment form and its order-summary sidebar. `CheckoutSummary` takes an optional `couponSlot` node, rendered where the cart path's read-only applied-coupon line would go — Buy Now is the only current user of it (see below).
- `components/BuyNowCouponForm.tsx` — the coupon apply/remove UI for the Buy Now path, since it has no cart page to have applied one on beforehand.
- `api/checkoutApi.ts` / `checkoutSchemas.ts` — `POST /orders/checkout` and its request/response shapes, plus `previewBuyNowCoupon` (`POST /coupons/preview-buy-now`).
- `hooks/useCheckout.ts` — the submit mutation.
- `hooks/useBuyNowCouponPreview.ts` — the Buy Now coupon-preview mutation `BuyNowCouponForm` calls.
- `hooks/useBuyNowPayload.ts` / `lib/buyNowStorage.ts` / `lib/buildBuyNowCart.ts` — the Buy Now path (see below).

## Funnel

**User-facing**: fill in delivery address, pick a payment method, submit. COD lands straight on the order confirmation page; eSewa/Khalti redirect to the gateway first.

**Technical**: `CheckoutBody` reads either the persisted cart (`useCart`) or a Buy Now payload, builds a `Cart`-shaped object either way, and hands it to `CheckoutForm`, which submits via `useCheckout` → `checkoutApi.submit` → `POST /orders/checkout` (see `apps/api/src/modules/orders/README.md`).

## Buy Now bypasses the cart entirely

`ProductDetail.tsx`'s Buy Now button calls `saveBuyNowPayload` (a `sessionStorage` write, not a cart mutation) with everything needed to render an order summary, then navigates to `/checkout?buyNow=1`. `CheckoutBody` reads that flag via `useSearchParams` and, when set, skips `useCart()` entirely — `useBuyNowPayload` reads the stored payload post-mount (inside an effect, not during render, so the client-only `sessionStorage` read can't cause a hydration mismatch against the server-rendered HTML) and `buildBuyNowCart` turns it into the same `Cart` shape the normal flow uses, computing `deliveryFee` with the identical threshold math the backend and `cartService` already use (via `resolveZonePreview`'s `standardDeliveryFee`/`freeDeliveryThreshold`). `CheckoutForm` is unchanged by any of this — it only ever consumes a `Cart`, never knows which source it came from — except that on submit it also passes `{ productId, sizeId, qty }` through as `buyNow` in the request body, and clears the stored payload once the order is placed.

This is deliberate: the shopper's persisted cart is never read or written by a Buy Now purchase, so it can't pick up an unwanted item or lose one, and checking out shows only the one item being bought — not whatever else happens to be sitting in the cart.

**Buy Now has its own coupon UI because it has no cart page to apply one on.** `BuyNowCouponForm` (rendered via `CheckoutSummary`'s `couponSlot`, so it sits with the order summary rather than the address/payment column) calls `useBuyNowCouponPreview` → `POST /coupons/preview-buy-now` to validate a code against the single Buy Now line before the shopper commits, and `CheckoutBody` holds the resulting preview in state, feeding it into `buildBuyNowCart` (which subtracts `discountAmount` from `total` and evaluates the free-delivery threshold against the pre-coupon subtotal, matching the backend's own order of operations) and into `CheckoutForm`'s submit call as `couponCode`. The preview is a convenience, not the source of truth — `checkoutOnce` revalidates the code from scratch server-side, same as the cart path's apply-then-checkout double validation (`apps/api/src/modules/coupons/README.md`).

## Non-obvious rationale

**Every client-generated id in this feature goes through `@outfiqe/utils`' `generateUuid`, never `crypto.randomUUID()` directly.** `randomUUID` requires a secure context, which isn't guaranteed for every way this app gets opened (a LAN IP over plain HTTP during on-device testing, for one) — calling it directly once threw a bare `TypeError` before the checkout request was even built, surfacing only as a generic "Something went wrong" toast with nothing in the server logs to explain it. `generateUuid` falls back to `crypto.getRandomValues` (no such restriction) to hand-build the id instead.

**Checkout refuses to submit while offline, and the two mutations involved are set to
`networkMode: "always"` rather than the library default.** TanStack Query's default
`networkMode: "online"` does not fail a mutation started while offline — it silently pauses it and
fires it automatically the moment the connection returns, however long that takes. For a like or a
follow that is exactly the behaviour we want (see `apps/web/src/features/pwa/README.md`'s "saving
actions made while offline"), but for placing an order or initiating a payment it is dangerous: a
shopper could submit, walk away, and have the order or payment attempt go through minutes later
against a price or stock level that no longer matches what they saw, with no chance to reconsider.
`networkMode: "always"` makes `useCheckout`/`useInitiatePayment` attempt the request immediately
regardless of connectivity, so a genuinely offline attempt fails fast with a normal network error
instead of queueing invisibly. `CheckoutForm` also checks the connection itself before ever calling
either mutation, and `CheckoutSummary` disables the button and explains why — the mutation setting
is the backstop for a submission that starts online and drops mid-flight, not the primary defence.
