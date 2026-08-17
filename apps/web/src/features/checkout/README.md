# Checkout

## Purpose

The delivery-details-and-payment-method form that turns a cart (or, since Buy Now, a single item) into an order.

## Structure

- `components/CheckoutBody.tsx` — the page's top-level gate: resolves auth, loads the cart (or a Buy Now payload), and picks which state to render.
- `components/CheckoutForm.tsx` / `CheckoutSummary.tsx` / `PaymentMethodField.tsx` — the address + payment form and its order-summary sidebar.
- `api/checkoutApi.ts` / `checkoutSchemas.ts` — `POST /orders/checkout` and its request/response shapes.
- `hooks/useCheckout.ts` — the submit mutation.
- `hooks/useBuyNowPayload.ts` / `lib/buyNowStorage.ts` / `lib/buildBuyNowCart.ts` — the Buy Now path (see below).

## Funnel

**User-facing**: fill in delivery address, pick a payment method, submit. COD lands straight on the order confirmation page; eSewa/Khalti redirect to the gateway first.

**Technical**: `CheckoutBody` reads either the persisted cart (`useCart`) or a Buy Now payload, builds a `Cart`-shaped object either way, and hands it to `CheckoutForm`, which submits via `useCheckout` → `checkoutApi.submit` → `POST /orders/checkout` (see `apps/api/src/modules/orders/README.md`).

## Buy Now bypasses the cart entirely

`ProductDetail.tsx`'s Buy Now button calls `saveBuyNowPayload` (a `sessionStorage` write, not a cart mutation) with everything needed to render an order summary, then navigates to `/checkout?buyNow=1`. `CheckoutBody` reads that flag via `useSearchParams` and, when set, skips `useCart()` entirely — `useBuyNowPayload` reads the stored payload post-mount (inside an effect, not during render, so the client-only `sessionStorage` read can't cause a hydration mismatch against the server-rendered HTML) and `buildBuyNowCart` turns it into the same `Cart` shape the normal flow uses, computing `deliveryFee` with the identical threshold math the backend and `cartService` already use (via `resolveZonePreview`'s `standardDeliveryFee`/`freeDeliveryThreshold`). `CheckoutForm` is unchanged by any of this — it only ever consumes a `Cart`, never knows which source it came from — except that on submit it also passes `{ productId, sizeId, qty }` through as `buyNow` in the request body, and clears the stored payload once the order is placed.

This is deliberate: the shopper's persisted cart is never read or written by a Buy Now purchase, so it can't pick up an unwanted item or lose one, and checking out shows only the one item being bought — not whatever else happens to be sitting in the cart.
