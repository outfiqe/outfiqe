# Orders — checkout

## Purpose

Turns a shopper's cart (or a single Buy Now item) into a paid or cash-on-delivery order, then carries it through fulfilment, cancellation and returns — for the shopper, the admin team, and each brand shipping its own part of the order.

## Structure

- `order.routes.ts`, `order.controller.ts` — the HTTP layer for shopper, admin and brand endpoints.
- `order.service.ts` — `orderService`, the only object the controller and other modules import. It holds the shopper/admin reads (`getOrder`, `listOrders`, `listAllAdmin`, `getOrderAdmin`) and `advanceFulfilment`, and spreads in every topic service below.
- `order.repository.ts` — `orderRepository`: order reads and writes, payment-state changes (`markCancelled`, `markReturned`, `markRefunded`, `failUnsettledPayment`, `markNeedsManualRefund`), and `listSettledPurchasedProductIds`. Spreads in `orderFulfilmentGroupRepository`.
- `order.utils.ts` — the order, item, payment and admin view mappers, and `deriveOrderFulfilment` (the order-level fulfilment rollup, unit-tested in `order.utils.test.ts`).
- `order.attribution.utils.ts` — creator attribution for each line (see "Attribution" below).
- `order.constants.ts` — `FULFILMENT_ADVANCE_FROM` (which statuses each step can move from), the audit target type, and the stale-shipment reminder settings.
- `order.jobs.ts` — the stale-shipment reminder job.
- `order.schemas.ts`, `order.types.ts` — request validation and response shapes.
- `checkout/` — one checkout, read top to bottom in `checkout.service.ts`: `orderCheckoutService.checkout` (idempotency) calls `checkoutOnce`, which runs each step below in order. The checkout and checkout-limits integration tests sit here too.
  - `checkout.lines.ts` — the lines being bought (the Buy Now item, or the cart) and the stock check before anything is priced.
  - `checkout.pricing.ts` — brand discounts, the coupon, delivery and COD fees, and the money check (`assertOrderMoneyInvariant`).
  - `checkout.attribution.ts` — which creator or build each line is credited to, and the commission tier and shares that follow.
  - `checkout.utils.ts` — `toAttributedOrderItems`, turning priced, attributed lines into order items (unit-tested).
  - `checkout.settlement.ts` — the commission rule, gateway fee and exempt brands loaded before the transaction, and the brand payout and creator commission rows written inside it.
  - `checkout.commit.ts` — the other writes inside the transaction: the cash-on-delivery stock decrement, the coupon redemption, and one fulfilment group per brand.
  - `checkout.after-commit.ts` — what happens only once the order is saved: domain events and the confirmation emails.
  - `checkout.types.ts`, `checkout.constants.ts` — the shapes passed between steps, and the endpoint name and statuses.
- `cancellation/` — `cancellation.service.ts` (`orderCancellationService.cancel`, cancel-and-refund-if-paid for admins and shoppers) and its integration test.
- `returns/` — `return.service.ts` (`orderReturnService.markReturned`, including the refund and the manual-refund alert) and its integration test.
- `fulfilment-groups/` — one shipment per brand: `fulfilment-group.service.ts` (the brand endpoints), `fulfilment-group.repository.ts` (`orderFulfilmentGroupRepository`, every `OrderFulfilmentGroup` read and write, including `setOrderFulfilmentRollup`), `fulfilment-group.utils.ts` (the brand-facing views, also used by `../brand-overview`), and the integration tests.

Shared integration-test setup lives in `src/testing/integration/order-fixtures.ts`.

## Funnel

**User-facing:** a shopper checks out from their cart or with Buy Now, pays by eSewa/Khalti or chooses cash on delivery, and sees the order in their account. Each brand packs and ships its own part of the order from the brand dashboard. The shopper can cancel before it ships; the admin team can advance, cancel, refund, or mark an order returned.

**Technical:** `order.routes.ts` → `order.controller.ts` → `orderService` (or the topic service it spreads in: `checkout/`, `cancellation/`, `returns/`, `fulfilment-groups/`) → `orderRepository` / `orderFulfilmentGroupRepository` → Postgres via Prisma, inside one transaction per write. Checkout and payment confirmation publish domain events over Redis Streams for XP, notifications and commissions.

## Only shoppers can buy

The buyer-facing routes — `POST /orders/checkout`, `GET /orders`, `GET /orders/:orderId`,
`POST /orders/:orderId/cancel` — are gated by `requireShopper` (`[requireAuth, requireRole(UserRole.CUSTOMER)]`),
not bare `requireAuth`. `CUSTOMER` is the whole buyer audience: creators shop too and are
`CUSTOMER`-role accounts with `isCreator` set; `BRAND_OWNER` and `ADMIN` are explicitly not
buyers. Before this, any authenticated account could complete a purchase. The cart routes
(`apps/api/src/modules/cart`) carry the same guard, since a cart is a checkout precursor. The
`/orders/brand/*` fulfilment routes keep their own `requireBrandOwner`, and `/orders/admin/*`
keep `requireAdmin`. (`requireShopper` is inlined in both `order.routes.ts` and `cart.routes.ts`,
matching the existing per-module `requireBrandOwner`/`requireAdmin` arrays; consolidating all
three into `#middlewares` is a reasonable follow-up.)

## Stock decrement timing depends on payment method

COD orders decrement stock immediately, inside the checkout transaction — there's no gateway step, so the order is as good as committed the moment it's placed. eSewa/Khalti orders do **not** decrement stock at checkout — only at payment verification (see the `payments` module). This matches "nothing is reserved while a payment is in progress": an abandoned eSewa session shouldn't hold the last unit of something hostage for up to an hour while the reconciliation sweep waits it out.

## Gamification events (`PRODUCT_PURCHASED`, `SALE_GENERATED`)

`checkoutOnce` publishes both, always **after** `prisma.$transaction` resolves, never inside it (same "no side effect inside the DB transaction" rule email-sending already follows here). `PRODUCT_PURCHASED` only fires for COD — eSewa/Khalti orders aren't genuinely purchased yet at checkout (`paymentStatus: INITIATED`, no money moved), so that half is `payments`' responsibility once a wallet payment actually settles (see `payments/README.md`). `SALE_GENERATED` fires once per `CreatorCommission` created here, for **every** payment method — commission creation already happens speculatively at order-placement time regardless of payment method (see `commissions/README.md`), so the XP event follows the same timing. See `xp/README.md` for what each event triggers.

## Transaction boundary

Everything read-only (cart contents, stock levels, attribution resolution, commission tier lookup) happens _before_ `prisma.$transaction` opens. Only the stock decrement, the order+items insert, and the commission inserts happen inside it — kept short deliberately, no gateway or email call is ever inside a transaction. Verified against the real DB: two concurrent checkouts for a size with exactly 1 unit left resolve to one success and one clean `ITEMS_UNAVAILABLE`, with final stock at 0.

## Settlement ledger: `BrandPayout` is created for every item, not just attributed ones

`checkoutOnce` creates one `BrandPayout` per order item inside the same transaction as
`CreatorCommission` — but unlike commissions (attributed sales only), **every** item gets one,
regardless of creator attribution. A brand is owed its cut of a sale whether or not a creator
sourced it; commission is an additional payout on top, not a substitute. The active
`PlatformCommissionRule` is read once before the transaction opens (a rule change mid-checkout
isn't a correctness issue — rule rows are deactivated, never deleted, so the FK stays valid
either way) and snapshotted onto each `BrandPayout` (`commissionRuleId`, `platformFee`), same
"never let a later rate change retroactively touch an existing payable" rule commission tiers
already follow. See `brand-payouts/README.md` for the fee math and lifecycle.

`orderService.cancel`'s transaction voids `PENDING` `BrandPayout` rows the same way it already
voids `PENDING` commissions — one more atomic conditional update, no new failure mode.

`brandId` is resolved per line (from the product, threaded through `lines`) purely for building
the `BrandPayout` row — it must **not** leak into the `OrderItem` create payload (`OrderItem` has
no `brandId` column). `items` is built by destructuring `brandId` back out of each line before
spreading it into the Prisma create call; this was an actual `PrismaClientValidationError` caught
by the checkout integration test, not a hypothetical one.

## Brand-funded discounts: `unitPrice` is resolved before anything else runs

`checkoutOnce` builds `lines` with `listUnitPrice` (the product's raw `Product.price`, read
server-side same as always), then — before computing `subtotal`, resolving attribution, or looking
up a creator's commission tier — batches a single `productRepository.findActiveDiscountsByProductIds`
call across every distinct product in the cart/buy-now line set and derives `pricedLines`, each with
`unitPrice` (`resolveBrandFundedUnitPrice(listUnitPrice, activeDiscount)`,
from `../discounts/discount.utils.js`) and `brandDiscountAmount` (`listUnitPrice - unitPrice`).
Every downstream computation — `subtotal`, the commission tier lookup
(`commissionRepository.findTierForPrice`), and `grossAmount` inside the settlement loop — reads
`pricedLines`, never the pre-discount `lines`. This is deliberate, not incidental: it's what makes
`BrandPayout.grossAmount = unitPrice × qty` stay true with **zero changes** to the settlement code
in the section above — a discounted order's payout math is byte-identical to a full-price order at
the discounted price, verified in `checkout/checkout.integration.test.ts`.

**Commission currently follows the discounted price, not list price** — `findTierForPrice` is
called with `pricedLines[index].unitPrice`, so a creator's flat per-band commission reflects what
was actually sold. This is the discount-architecture spec's own recommended default for "does a
brand discount reduce creator commission," not an arbitrary implementation choice, but it wasn't a
question this module could defer: checkout has to compute _some_ commission at write time. Worth
flagging back to the business rather than treating as silently settled — the spec's fuller
recommendation (replacing the flat band ladder with a percentage before running large brand sales,
to remove the "6% price cut drops a whole commission band" cliff) is explicitly a follow-up, not
built here.

Fetching discounts by `orderPlacedAt` (the same `Date` used for attribution resolution, not a fresh
`new Date()` per lookup) means a discount whose window starts or ends in the middle of a slow
checkout request is judged consistently against one instant, not two. A discount created _after_
`orderPlacedAt` naturally can't match `startsAt <= orderPlacedAt`, so an already-in-flight or
already-placed checkout is never retroactively affected — proven directly
(`checkout/checkout.integration.test.ts`, "never retroactively changes an already-placed order").

## Idempotency is claim-first, not check-then-write

`withIdempotency` (`#lib/idempotency.utils.js`) inserts a `RequestIdempotency` row with a pending sentinel _before_ running the handler — the unique constraint on `(userId, endpoint, key)` is what makes the claim atomic, done as an `INSERT ... ON CONFLICT DO NOTHING` so the loser finds out from the insert itself rather than from a second read. A losing concurrent request gets a `DUPLICATE_REQUEST` 409, not a silently-created second order. An earlier check-then-write version of this was tested and proven to let two concurrent requests both create orders; this version was verified to produce exactly one success and one 409 under the same conditions.

**A failed request frees its key only when the failure was a business rejection.** When the handler throws an `AppError` (items sold out, coupon exhausted, and so on), nothing was committed, so the claim is deleted and the shopper can retry with the same key. Before this, the pending row stayed forever and every retry with that key got a 409. Any other error keeps the claim: an unexpected failure might have happened after the order was already committed, and freeing the key then could create a second order on retry. Such keys expire with the 24-hour cleanup (`runIdempotencyKeyRetentionSweep`, wired in `src/jobs/scheduled-jobs.ts`).

**Callers can also pass the request body**, which is stored as a hash. The same key sent with a different body is then refused with `422 IDEMPOTENCY_KEY_REUSED` instead of silently replaying the first answer. Checkout doesn't pass a body yet, so its behaviour is unchanged; new endpoints should.

## Every stock change points back at its order

Checkout generates the order id before its transaction starts, so the stock decrement it makes can be written to the inventory ledger against that order in the same transaction (`../products/README.md`, "Inventory ledger"). Payment settlement and cancellation record their stock changes against the same order id.

## Buy Now — a second, cart-bypassing line-item source

`checkoutBodySchema.buyNow` (`{ productId, sizeId, qty }`) lets the web app check out a single item without ever writing to `Cart`/`CartItem`. `checkoutOnce` branches before building `lines`: with `buyNow`, it independently re-fetches the product (must be `APPROVED`) and confirms the size actually belongs to it — the client-sent `productId`/`sizeId` are never trusted for price, same rule the cart path already follows — instead of reading `cartRepository.listItems`. Everything downstream (stock validation, the `$transaction`, `decrementStockForItems`, attribution, commission, idempotency) is unchanged, since it already operated on a generic `lines` array; only the cart-empty check and the final `clearCart` are skipped when `buyNow` is set, since there's nothing to clear.

A coupon on the Buy Now path follows the same branch: `checkoutBodySchema.couponCode` (optional) is only honoured when `buyNow` is set — a non-buy-now checkout still only ever spends the coupon stored on `Cart.appliedCouponCode`, never a client-supplied code, since a real cart's applied coupon is the one thing about it that already went through server-side validation on `POST /cart/coupon`. Buy Now has no equivalent stored state to trust, so accepting the code directly in the checkout body is the correct call, not a shortcut — see `../coupons/README.md` for the preview endpoint that lets the web UI show the discount first.

This exists because the checkout page only ever renders one persisted cart — a "Buy Now" button on a product page can't safely reuse that without either merging into the shopper's real cart (surprising, and no longer "just this item") or duplicating the whole atomic order-creation path a second time. Branching the line source was the smaller, lower-risk change.

## Attribution: `clickId` vs `referenceId`

`AttributionCandidate.clickId` is the click/tap event (`CreatorLookTagClick.id` or `CreatorLinkClick.id`) and feeds `CreatorCommission.tagClickId`/`linkClickId`. `AttributionCandidate.referenceId` is what the click points to (`CreatorLook.id` or `CreatorLink.id`) and feeds `OrderItem.attributedCreatorLookId`/`attributedLinkId`. These are different rows with different foreign keys — conflating them was an actual bug caught by the verification script (foreign key violation), not a hypothetical one.

A `CreatorLink` with `productId: null` is a general/profile link — it's treated as a candidate for whatever product was actually bought, not just one specific product. A product-scoped `CreatorLink` only counts for that product.

## Attribution: shopping from a build

`order.attribution.utils.ts` has three candidate sources: tag clicks, creator link clicks, and
`OutfitBuildVisit` rows. A visit is written when a shopper adds an item to their bag from a build
(`outfits/outfit-cart.service.ts`), recording the build and the locked version they saw. The
latest candidate inside the attribution window wins across all three, so a build visit and a
creator's link compete fairly. Builds removed by moderation no longer attribute.

`AttributionCandidate` is a discriminated union on `source`. A build sale sets
`OrderItem.attributedOutfitId`/`attributedOutfitVersion` (not `attributedCreatorId`, because a
build has many contributors), uses the `OUTFIT_BUILD` commission tier, and is turned into one
commission row per contributor by `resolveCommissionShares` (see `../commissions/README.md` for
the split rules). `SALE_GENERATED` events go out for the people's shares only; brands follow
their earnings in the wallet.

## Admin — fulfilment + cancel/refund (chunk 15)

`GET /orders/admin`, `GET /orders/admin/:orderId`, `PATCH /orders/admin/:orderId/fulfilment`,
`POST /orders/admin/:orderId/cancel` — all `requireAuth`+`ADMIN`, registered **before** the
buyer-facing `/:orderId` route (same "static paths first" ordering `creator-looks` already needed —
Express would otherwise match `/admin` against `/:orderId` and treat "admin" as an order id).

**Fulfilment only moves forward, one step at a time**: `PLACED→PACKED→SHIPPED→DELIVERED`, each
transition an atomic conditional `updateMany` guarded by the specific status it must be leaving
(no skipping straight to `DELIVERED`, no re-doing a step). Moving to `DELIVERED` stamps
`deliveredAt` — this is the field chunk 10's commission-approval sweep has been waiting on since
nothing set it before this chunk. The admin advance is order-global: it moves **every** active
fulfilment group to the new status, stamps the matching timestamp, and recomputes the order rollup
(`fulfilmentStatus` + `fulfilmentSummary`) from the group statuses. `getOrderAdmin` returns
`fulfilmentGroups[]` (brand name, per-group status, tracking, and any brand cancellation request)
so an admin can see and act on each brand's shipment — see "Per-brand fulfilment groups".

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

**Stock is only restored if it was ever decremented.** A COD order decrements at checkout; a
wallet order decrements only at settlement (`paymentStatus: PAID`). Cancelling a wallet order that
never got past `INITIATED`/`FAILED` (an abandoned or failed gateway hand-off, which the buyer can
now do from the order page — see `apps/web/src/features/orders/README.md`) held no stock, so
`restoreStockForItems` is skipped for it — running it unconditionally would credit inventory that
was never taken. Commission/payout voiding stays unconditional: those rows are created
speculatively at checkout for every payment method and a `PENDING`-guarded void is a safe no-op
when there's nothing to void.

**Cancelling an unpaid wallet order also fails the payment side.** `cancel` leaves `paymentStatus`
alone for a COD (`DUE`) or paid (`REFUNDED`/`needsManualRefund`) order, but for one still
`INITIATED` it sets `paymentStatus: FAILED` and flips every pending `PaymentTransaction` to
`FAILED` in the same transaction (`failUnsettledPayment` + `failPendingTransactions`). Without
this, `fulfilmentStatus` went `CANCELLED` while `paymentStatus` stayed `INITIATED`, so the web
order page still treated it as "awaiting payment" and offered Resume/Cancel buttons that then
409'd. `paymentService.initiate` also refuses outright once `fulfilmentStatus === CANCELLED`
(`ORDER_CANCELLED`), so a stale client can't start a new attempt on a cancelled order.

## Admin — "Returned / returned to origin"

`POST /orders/admin/:orderId/return` with `{ reason }` handles a parcel that came back: refused
at the door, returned by the courier, or sent back after delivery. It works on `SHIPPED` and
`DELIVERED` orders only and moves the order and every group to `RETURNED` (the rollup treats a
returned group like a cancelled one when working out progress).

In one transaction it marks the order returned (a conditional update, so a double click returns
`409` instead of restocking twice), puts the stock back through the stock ledger
(`ORDER_RESTORE`), voids every commission row not yet paid, and voids the brand payouts that
haven't been withdrawn yet. It then counts the commission already paid and the payouts already
withdrawn; when either is above zero the response says `needsClawback: true`, and the admin
screen tells finance to recover that money by hand.

The refund runs **after** the transaction commits, unlike cancel. The status change is what
decides which admin call wins, so only that one call refunds; refunding first would let two
quick clicks refund twice. A failed or thrown refund sets `needsManualRefund` and emails ops.
The action is written to `PlatformAuditLog` (`order.returned-to-origin`) with the reason and the
counts.

## Admin — Returned / returned to origin

`POST /orders/admin/:orderId/return` (`ordersManage`, with a reason) handles a parcel that comes
back after it left: refused at the door, undeliverable, or returned after delivery. There is no
courier integration; an admin records it. Only `SHIPPED` or `DELIVERED` orders qualify.

In one transaction it moves the order and its fulfilment groups to `RETURNED` (stamping
`returnedAt`/`returnReason`, guarded by the status it is leaving, so a double click returns
`409` the second time), puts the stock back through the ledger (`ORDER_RESTORE`), voids every
commission row not yet paid, and voids the brand payout if it is still `PENDING` or `AVAILABLE`.
Rows already paid out (`PAID` commission, `WITHDRAWN` payout) are counted, not touched; the
response says `needsClawback` and the admin page shows a warning so finance can recover the
money by hand.

The refund runs **after** that transaction, and only for a `PAID` order. Unlike cancel, it does
not refund first, because a return can only happen once and the guarded status change has to
win before any money moves. A refund that fails or throws marks `needsManualRefund` and emails
ops. Every return is written to `PlatformAuditLog` (`order.returned-to-origin`) with the counts.

## Buyer self-service cancellation

`POST /:orderId/cancel` (any authenticated user, no admin role) is the same `orderService.cancel`
transaction as the admin path above — `cancel` takes a `CancelOrderActor`
(`{ type: "ADMIN"; adminUserId } | { type: "BUYER"; userId }`) instead of assuming an admin. A
`BUYER` actor gets an extra ownership check (`order.userId !== actor.userId` → `404`, not `403` —
same "don't reveal another user's order exists" reasoning used elsewhere) before the existing
`CANCELLABLE_FULFILMENT_STATUSES` window check, so a buyer can only ever cancel their own
`PLACED`/`PACKED` order, same restriction admin already enforces. `reason` is optional on this
route (defaults to `"Cancelled by buyer"`, filled in by the controller) — required and
admin-authored on the admin route, same schema-per-route split `cancelOrderSchema`/
`cancelMyOrderSchema` already follows for other admin-vs-buyer field differences in this module.

Brands don't cancel directly — a brand can only **request** cancellation of its own fulfilment
group (`POST /orders/brand/fulfilment-groups/:groupId/request-cancellation`), which flags the group
for an admin. The actual cancel + refund stays this `orderService.cancel` transaction, run by an
admin, because a single order can hold items from multiple brands and the refund/stock/coupon math
is whole-order today. See "Per-brand fulfilment groups" below.

## Per-brand fulfilment groups

An order is split into one **`OrderFulfilmentGroup`** per `(order, brand)` — the unit a brand
actually fulfils. `checkoutOnce` creates the groups inside the same transaction as the order,
payouts and commissions, and points each `OrderItem` at its group. Every existing order was
backfilled the same way (`prisma/backfill-order-fulfilment-groups.ts`, idempotent on the
`orderId + brandId` unique key).

**Two status fields, deliberately separate** (the Shopify model):

- `OrderFulfilmentGroup.status` — the per-shipment lifecycle (`PLACED → PACKED → SHIPPED →
DELIVERED`, or `CANCELLED`), reusing the existing `FulfilmentStatus` enum. This is what a brand
  advances.
- `Order.fulfilmentSummary` — a new coarse enum (`UNFULFILLED | PARTIALLY_SHIPPED | SHIPPED |
FULFILLED | CANCELLED`) derived from the groups. This is the order-level truth for UI.
- `Order.fulfilmentStatus` (the old enum) is **kept and recomputed as the least-progressed
  non-cancelled group**, purely so every pre-existing filter/badge/query keeps working untouched.
  The nuance lives in `fulfilmentSummary`, not here.

`deriveOrderFulfilment(groupStatuses)` (`order.utils.ts`, unit-tested against the full matrix) owns
both. **Cancelled groups are ignored for progress** unless every group is cancelled — one brand
cancelling its shipment on a two-brand order must not hold the order back from `FULFILLED`.

**Brand endpoints** — `GET /orders/brand/fulfilment-groups`, `GET
/orders/brand/fulfilment-groups/:groupId`, `PATCH /orders/brand/fulfilment-groups/:groupId`, `POST
/orders/brand/fulfilment-groups/:groupId/request-cancellation`. All `requireAuth`+`BRAND_OWNER`,
resolve the caller's brand via the shared `requireBrandId`, and scope every query to that brand —
another brand's group is a `404`, never a `403` (same "don't reveal it exists" reasoning as buyer
order access). The `PATCH`/`POST` writes carry `brandFulfilmentRateLimit`.

The **brand-safe detail** returns this brand's line items with their full price/discount breakdown,
the buyer ship-to **name, phone and address** (a brand hands the parcel to a courier — the phone is
operationally required, especially for COD in Nepal), this brand's `BrandPayout` figures for the
group (gross / platform fee / gateway fee / net), and the order-level `fulfilmentSummary`. It does
**not** expose other brands' line items, the buyer's email, or the payment/transaction log. (This
reverses the earlier "brands see item-level rows, no PII" decision — see the git log — because
brands now self-fulfil, which is what a single-order detail page is for.)

`advanceBrandFulfilmentGroup` uses the same forward-only, one-step transition guard as the admin
path (`FULFILMENT_ADVANCE_FROM`), scoped by the group's current status in the `updateMany` `where`.
Marking a group `SHIPPED` requires `carrier` + `trackingNumber` (Zod `.refine`). After a successful
advance it recomputes the order rollup in a transaction and publishes `ORDER_STATUS_CHANGED`
**only when the order-level status actually moved** (so a partial advance on a multi-brand order
doesn't fire a premature "delivered" notification). Orders with no groups (legacy rows before the
backfill ran) fall back to deriving the rollup from the incoming status.

`requestBrandFulfilmentGroupCancellation` only flags the group (`cancellationRequestedAt` +
`cancellationReason`) and logs for ops — the actual cancel + refund stays `orderService.cancel`, an
admin action. `getOrderAdmin` surfaces the request (and every group's status/tracking) so an admin
can act on it.

**Deferred, on purpose:**

- **Per-group cancel with per-group refund math.** `orderService.cancel` is whole-order: full
  refund, all stock restored, all payouts/commissions voided, whole coupon budget released,
  `assertOrderMoneyInvariant` over the whole order. A partial cancel needs partial gateway refunds
  (eSewa/Khalti support unknown), proportional coupon-budget release, a new partial money
  invariant, and product calls (refund the delivery fee on a partial cancel? a COD order where
  nothing was captured?). That's its own project; the brand request + admin visibility is the 80%
  that unblocks the workflow.
- **Phone-number masking / relay.** The brand sees the real number today. A masked relay needs a
  telephony provider, a rented number pool, per-shipment assignment and call/SMS webhooks — a
  privacy enhancement on a working system, worth doing when volume justifies the cost.

## `Order.deliveredAt` is stamped from the group rollup, not the group itself

`setOrderFulfilmentRollup` (`fulfilment-groups/fulfilment-group.repository.ts`) is the single place that writes
`Order.fulfilmentStatus`/`fulfilmentSummary` after any group changes — the admin advance path and
`advanceBrandFulfilmentGroup` both funnel through it. It also stamps `Order.deliveredAt` the moment
the recomputed rollup reaches `DELIVERED`, guarded by `deliveredAt: null` so it's only ever set
once. This is the field `commission.repository.ts`/`brand-payout.repository.ts`'s
`findApprovableIds` sweeps read (`fulfilmentStatus = DELIVERED AND deliveredAt <= cutoff`) to mature
commissions and brand payouts — before this, a brand marking its own shipment delivered moved the
order to `DELIVERED` without ever stamping the timestamp those sweeps depend on, so a brand-fulfilled
order's commission/payout could never mature. On a multi-brand order this only fires once every
group has delivered (`deriveOrderFulfilment` only reaches `DELIVERED` there), never on the first
brand to ship.

## Stale-shipment reminder digest

A brand can mark a group `SHIPPED` and then never come back to mark it `DELIVERED` — there's no
courier webhook doing this automatically yet (see the deferred phone-masking note above for the
same "manual for now, automate when volume justifies it" stance). `runStaleShipmentReminderDigest`
(`order.jobs.ts`) runs daily (`STALE_SHIPMENT_REMINDER_INTERVAL_MS`,
`scheduled-jobs.ts`), finds every brand with at least one group stuck at `SHIPPED` for more than
`STALE_SHIPMENT_REMINDER_MIN_AGE_DAYS` (7) days (`listBrandsWithStaleShippedShipments`), and emails
each one a single digest naming how many shipments need attention, linking to `/manage-orders`.

This is a nudge, not an automatic status change — it never marks anything `DELIVERED` on a brand's
behalf, since only the brand (or an admin) actually knows a parcel arrived. Deliberately plain email
rather than the in-app notification stack `tag-review-reminder-digest` uses
(`NotificationType`/`packages/types`/`packages/components` bell routing) — that stack is worth it
for a high-volume, cross-app notification; at current order volume a single scheduled email covers
the same need without a new migration or cross-package churn. Worth upgrading to an in-app
notification once shipment volume makes an email easy to miss.
