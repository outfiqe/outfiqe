# cart

## Purpose

The shopper's bag: the `/cart` page, and the hooks other features use to add to it (the product page's Add to bag) or read it (checkout).

## Structure

- `components/CartBody.tsx` — the `/cart` page body. It shows a sign-in prompt to a signed-out visitor, `NotAShopperNotice` to a brand owner or staff member, a skeleton while loading, an empty state when the bag is empty or everything in it has sold out, and otherwise the items beside the city field and summary.
- `components/CartItemRow.tsx` — one item: image, name, size, quantity controls and remove. A sold-out item stays in the list, faded, without quantity controls.
- `components/CartCityField.tsx` — "Delivering to": a `CityAutocomplete` that saves the bag's city and previews that city's delivery fee and free-delivery threshold (`resolveZonePreview` from `delivery-zones`).
- `components/CartSummary.tsx` — subtotal, discounts, delivery fee and total, the coupon form, and the Checkout link.
- `components/CouponForm.tsx` — apply or remove a coupon code.
- `api/cartApi.ts`, `api/cartSchemas.ts` — the `/cart` client (`get`, add, update quantity, remove, set city, apply coupon, remove coupon) and the `Cart` shape.
- `hooks/useCart.ts` — the `["cart"]` query, only enabled for a shopper.
- `hooks/useAddToCart.ts`, `useUpdateCartItem.ts`, `useRemoveCartItem.ts`, `useUpdateCartCity.ts`, `useApplyCoupon.ts`, `useRemoveCoupon.ts` — one mutation each.
- `constants/cart.constants.ts` — `CART_QUERY_KEY`.
- `index.ts` — what other features import (`product-detail` adds to the bag, `checkout` reads it).

## Funnel

**User-facing:** a shopper adds a piece from its product page → opens `/cart` → changes quantities, removes pieces, picks the city they want it delivered to and sees the delivery fee update, applies a coupon → presses Checkout.

**Technical:** each component calls its hook → `cartApi` → `/api/cart/...` (`apps/api/src/modules/cart`). Every cart write returns the whole updated cart, and each mutation's `onSuccess` puts it straight into the `["cart"]` cache with `setQueryData`, so the page updates without a second request. A failed write shows a toast with `getErrorMessage`.

## Non-obvious rationale

**The cart is only fetched for a shopper.** Brand owners and staff can't buy, so `useCart` is disabled for them and `CartBody` shows `NotAShopperNotice` instead of an empty bag that would suggest they can.

**The delivery fee shown next to the city is a preview.** `resolveZonePreview` matches the city against the cached delivery zones (falling back to the default zone); the API works the real fee out again when the order is placed (`apps/api/src/modules/orders/checkout/checkout.pricing.ts`).
