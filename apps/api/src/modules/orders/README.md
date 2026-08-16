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

## Admin — fulfilment + cancel/refund (chunk 15)

`GET /orders/admin`, `GET /orders/admin/:orderId`, `PATCH /orders/admin/:orderId/fulfilment`,
`POST /orders/admin/:orderId/cancel` — all `requireAuth`+`ADMIN`, registered **before** the
buyer-facing `/:orderId` route (same "static paths first" ordering `creator-looks` already needed —
Express would otherwise match `/admin` against `/:orderId` and treat "admin" as an order id).

**Fulfilment only moves forward, one step at a time**: `PLACED→PACKED→SHIPPED→DELIVERED`, each
transition an atomic conditional `updateMany` guarded by the specific status it must be leaving
(no skipping straight to `DELIVERED`, no re-doing a step). Moving to `DELIVERED` stamps
`deliveredAt` — this is the field chunk 10's commission-approval sweep has been waiting on since
nothing set it before this chunk.

**Cancel is cancel-and-refund-if-paid as one action**, not two separate admin clicks — matches how
an ops person actually thinks about it. Only orders that haven't shipped yet (`PLACED`/`PACKED`)
can be cancelled. If the order was already `PAID`, the refund happens _before_ the DB transaction
opens (external HTTP call to the gateway, same "never span a transaction across a network call"
rule as everywhere else in this codebase) via `paymentService.refund()`:

- **Khalti**: a real automated refund call. On success, the transaction records a `REFUND`
  `PaymentTransaction` row and sets `paymentStatus: REFUNDED`. On failure, it still cancels the
  order (stock and commissions don't wait on the refund succeeding) but sets `needsManualRefund`
  instead and emails ops — same accepted-limitation pattern as the sold-out-after-payment case in
  `payments/README.md`.
- **eSewa/COD**: no automated API exists, so this is pure record-keeping — the admin action itself
  _is_ the confirmation that a human already refunded the buyer outside Outfiqe. Always "succeeds."

Restoring stock and voiding commissions happen inside the same DB transaction as the cancellation
itself (`productService.restoreStockForItems` + `commissionRepository.voidForOrder`, both already
proven atomic patterns from earlier chunks) — one atomic unit, not three separate writes that
could partially apply.

**Scope cut, not a gap**: only pre-shipment cancellation is handled. A post-delivery return/refund
(order stays `DELIVERED`, only the payment side changes) isn't covered — the plan described this
chunk as "manual refund/cancel recording" as one combined feature, and a standalone return flow
would need its own decision about whether stock goes back to sellable inventory, which is a
different question than "we never shipped it." Easy to add later as a separate action if needed.

## Brand visibility (chunk 16)

`GET /orders/brand` — `requireAuth`+`BRAND_OWNER`, resolves the caller's brand via the shared
`requireBrandId` (extracted from `products` in this same chunk, now used by both modules instead
of two copies of the identical membership lookup). Paginates over `OrderItem` rows filtered by
`product: { brandId }`, **not** whole orders — a single order can contain items from multiple
brands (one shopper checking out products from two different brands in the same cart), so an
order-level list would either leak another brand's line items or need per-brand filtering
downstream. Item-level pagination sidesteps that entirely: each brand only ever sees its own rows,
proven directly against the DB with a real two-brand order (brand A's list contained exactly its
own item, not the other brand's).

Deliberately visibility-only, no actions — fulfilment updates and cancellation stay admin-only
(chunk 15), since `fulfilmentStatus` lives on `Order`, not per-item, so there's nothing a single
brand could independently mark "shipped" in a multi-brand order without stepping on another
brand's item. Buyer PII (name/phone/address) is also deliberately left out of the response shape —
a brand doesn't ship directly, so it has no legitimate need for it.
