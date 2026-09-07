# Cart

## Purpose

The shopper's persisted bag: one `Cart` per user, holding `CartItem` rows plus the delivery `city`
and (since the discount-architecture work) an `appliedCouponCode`. Nothing here is trusted at
checkout — `orders` re-resolves stock, price, and coupon validity independently — this module exists
to give the shopper an accurate preview before they get there.

## Structure

- `cart.repository.ts` — `getOrCreateCart`/`listItems`/item CRUD/`updateCity`/
  `updateAppliedCouponCode`; `clearCart` also resets `appliedCouponCode`, since a cleared cart has
  nothing left for a stored code to apply to.
- `cart.service.ts` — `buildCartLines` fetches a cart's items once, batching stock, active brand
  discounts, and coupon-eligibility attributes (brand/category/product-type) per distinct product —
  the same batched-lookup shape `orders`' checkout uses, so a 10-item cart is a handful of queries,
  not one per item. `buildCartView` composes that into the full response; `applyCoupon`/`removeCoupon`
  mutate `appliedCouponCode` and re-render the view.
- `cart.types.ts` — `CartItemView` (per-item, includes `listUnitPrice`/`discountPercent` for the
  struck-through price), `CartView` (adds `platformDiscountTotal`/`appliedCoupon`).
- `cart.controller.ts`/`cart.routes.ts` — `GET /`, item CRUD, `PATCH /city`, and
  `POST`/`DELETE /coupon`.

## Funnel

**User-facing:** adding, updating, or removing an item, or changing the delivery city, all return
the same full `CartView` — the client never has to separately re-fetch after a mutation. Applying a
coupon works the same way: `POST /coupon` returns the repriced cart with `appliedCoupon` set (or a
clear error if the code doesn't apply), `DELETE /coupon` clears it.

**Technical:** `buildCartView` calls `resolveBrandFundedUnitPrice` (`../discounts`) per item for the
effective price, then — if a coupon code is stored — calls `couponService.resolveForContext`
(`../coupons`) to preview the coupon's value against the cart's current eligible lines. That preview
call is wrapped in a try/catch (`previewCoupon`): a coupon that's expired, exhausted, or otherwise
no longer valid just renders as "not applied" rather than failing the whole cart read — the stored
code is left alone so a fresh apply attempt still surfaces the real reason. `applyCoupon` is the one
place that doesn't swallow the error: it calls `couponService.resolveForContext` directly so an
invalid code fails loudly with a specific `AppError` code, and only stores the code once validation
actually passes.

## Non-obvious rationale

- **The coupon preview here is informational only.** `orders`' checkout never reads anything this
  module computed — it re-fetches the cart's raw items and `appliedCouponCode` and re-runs the same
  validation from scratch. If this module's preview and checkout's real resolution ever disagreed
  (a race, a bug), checkout's answer is the one that moves money; this module's is just what the
  shopper sees before they get there.
- **`hasBrandDiscount` (fed into `stacksWithBrandDiscount` filtering) is derived from whether an
  active discount exists for the product, not from comparing `unitPrice` to `listUnitPrice`** — both
  end up equivalent in practice, but checking the discount lookup directly is what `orders`' checkout
  does too, so both paths can never disagree about which lines count as "already discounted."
