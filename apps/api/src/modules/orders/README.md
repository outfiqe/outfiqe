# Orders — checkout

## Stock decrement timing depends on payment method

COD orders decrement stock immediately, inside the checkout transaction — there's no gateway step, so the order is as good as committed the moment it's placed. eSewa/Khalti orders do **not** decrement stock at checkout — only at payment verification (see the `payments` module). This matches "nothing is reserved while a payment is in progress": an abandoned eSewa session shouldn't hold the last unit of something hostage for up to an hour while the reconciliation sweep waits it out.

## Transaction boundary

Everything read-only (cart contents, stock levels, attribution resolution, commission tier lookup) happens _before_ `prisma.$transaction` opens. Only the stock decrement, the order+items insert, and the commission inserts happen inside it — kept short deliberately, no gateway or email call is ever inside a transaction. Verified against the real DB: two concurrent checkouts for a size with exactly 1 unit left resolve to one success and one clean `ITEMS_UNAVAILABLE`, with final stock at 0.

## Idempotency is claim-first, not check-then-write

`withIdempotency` inserts a `RequestIdempotency` row with a pending sentinel _before_ running the handler — the unique constraint on `(userId, endpoint, key)` is what makes the claim atomic. A losing concurrent request gets a `DUPLICATE_REQUEST` 409, not a silently-created second order. An earlier check-then-write version of this was tested and proven to let two concurrent requests both create orders; this version was verified to produce exactly one success and one 409 under the same conditions.

## Attribution: `clickId` vs `referenceId`

`AttributionCandidate.clickId` is the click/tap event (`CreatorLookTagClick.id` or `CreatorLinkClick.id`) and feeds `CreatorCommission.tagClickId`/`linkClickId`. `AttributionCandidate.referenceId` is what the click points to (`CreatorLook.id` or `CreatorLink.id`) and feeds `OrderItem.attributedCreatorLookId`/`attributedLinkId`. These are different rows with different foreign keys — conflating them was an actual bug caught by the verification script (foreign key violation), not a hypothetical one.

A `CreatorLink` with `productId: null` is a general/profile link — it's treated as a candidate for whatever product was actually bought, not just one specific product. A product-scoped `CreatorLink` only counts for that product.
