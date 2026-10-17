# Orders (web)

## Purpose

The buyer's view of their own orders — the list at `/orders` and the single-order page at
`/orders/[id]`, including resuming or cancelling an unpaid wallet order, cancelling single items
while the brand still has them, seeing each refund, and telling us where to send a refund that
can't go back automatically.

## Structure

- `components/OrdersListBody.tsx` — the `/orders` page body: auth gate (plus a `<NotAShopperNotice>`
  bounce for `BRAND_OWNER`/`ADMIN` — buyer order history is `CUSTOMER`-only, matching the
  `GET /orders` server gate), loading/empty states, and an infinite list of `OrderRow`s.
- `components/OrderRow.tsx` — one summary row in that list.
- `components/OrderDetailBody.tsx` — the `/orders/[id]` page body. Picks the header treatment from
  payment state and composes `OrderTracker` (or `ShipmentTrackers` for a multi-brand order) /
  `PendingPaymentPanel` / `TransactionLedger`.
- `components/OrderTracker.tsx` — the PLACED→PACKED→SHIPPED→DELIVERED stepper (or a "cancelled"
  line).
- `components/ShipmentTrackers.tsx` — when the order has more than one shipment (`order.shipments`,
  one per brand fulfilment group), renders a per-brand block: the brand name, that shipment's own
  `OrderTracker`, and its carrier + tracking number. A single-shipment order keeps the plain
  order-level `OrderTracker`. `order.fulfilmentSummary` (`UNFULFILLED`/`PARTIALLY_SHIPPED`/
  `SHIPPED`/`FULFILLED`/`CANCELLED`) is the coarse order-level status behind the scenes.
- `components/PendingPaymentPanel.tsx` — shown on the detail page for an unpaid wallet order:
  Resume payment (re-initiate + redirect to the gateway) and Cancel order (with a confirm modal).
- `components/CancelItemsModal.tsx` — "Cancel items": a units picker per cancellable line
  (`item.canCancel`, worked out by the API) plus an optional reason. Sends
  `POST /orders/:id/line-cancellations` with an `Idempotency-Key`.
- `components/OrderRefundsSection.tsx` — every refund on the order: amount, why, how the money
  came back (`constants/refundLabels.ts`), and the lines it covered. Shown once
  `order.refundedAmount > 0`.
- `components/RefundDetailsCard.tsx` — "Where should we send your refund?": Khalti ID, eSewa ID or
  a bank account (banks from `@/features/nepal-banks`), account holder name and a required "This
  account is mine" box. Prefilled from the order (`suggestedKind`/`suggestedWalletId`). Editable
  until staff mark the refund paid; after that it shows the saved details read-only, a bank
  account as its last 4 digits only.
- `components/StatusBadge.tsx` / `components/TransactionLedger.tsx` — payment/fulfilment badge and
  the transaction history block.
- `api/ordersApi.ts` / `orderSchemas.ts` / `refundSchemas.ts` — `GET /orders`, `GET /orders/:id`,
  `POST /orders/:id/cancel`, `GET /orders/:id/refunds`, `POST /orders/:id/line-cancellations`,
  `GET`/`PUT /orders/:id/refund-destination`, and the response shapes (mirrored from `apps/api`'s
  order module).
- `hooks/useOrder.ts` / `useInfiniteOrders.ts` / `useCancelOrder.ts` — the read queries and the
  cancel mutation.
- `hooks/useOrderRefunds.ts` / `useCancelOrderItems.ts` / `useRefundDestination.ts` /
  `useSaveRefundDestination.ts` — the refund reads and writes. `useCancelOrderItems` keeps one
  idempotency key per attempt and only makes a new one after a success, so a retried click can't
  cancel twice.
- `constants/refundLabels.ts` / `refundQueryKeys.ts`, `utils/refundDestination.utils.ts` — labels,
  query keys and the destination-kind type guard.

## Funnel

**User-facing**: open `/orders`, tap an order. A paid or COD order shows its delivery progress. A
wallet order whose payment never completed shows "Payment not completed" with Resume payment /
Cancel order instead of a delivery tracker.

**Refunds**: on an order still with the brand, "Cancel items" lets the buyer drop some units.
Khalti payments go straight back; a COD order just owes less; anything else (eSewa today) needs a
payout account, so the refund details card appears and the buyer gets an email and a notification
asking for it, then a reminder every 3 days until they add it. Staff pay it by hand and the buyer
is told when it's sent.

**Technical**: `OrderDetailBody` → `useOrder` → `GET /orders/:id`. Resume payment →
`useInitiatePayment` → `redirectToPaymentGateway` (see `../payments/README.md`). Cancel →
`useCancelOrder` → `POST /orders/:id/cancel`, then the `["orders"]` query cache is invalidated so
the page and list re-read. Refunds: `CancelItemsModal` → `useCancelOrderItems` →
`POST /orders/:id/line-cancellations`; `OrderRefundsSection` → `useOrderRefunds` →
`GET /orders/:id/refunds`; `RefundDetailsCard` → `useRefundDestination` / `useSaveRefundDestination`
→ `GET`/`PUT /orders/:id/refund-destination` (only fetched once the order has a refund).

## An unpaid wallet order is not "placed"

A wallet (eSewa/Khalti) order is created with `paymentStatus: INITIATED` and
`fulfilmentStatus: PLACED` (the DB default) — the fulfilment column says PLACED before any money
moves. So `OrderDetailBody` keys the "is this actually a live order" decision off `paymentStatus`,
not the tracker: while `paymentMethod !== COD && paymentStatus === INITIATED` it swaps the success
check-mark and the `OrderTracker` for `PendingPaymentPanel`. Once payment settles (or the API's
60-minute reconciliation sweep expires it) the normal view returns on the next refetch.

**Resume payment self-heals a stale "pending" view.** If the shopper actually completed an earlier
attempt (closed the tab before the callback fired, say), `POST /payments/:id/initiate` re-verifies
it, settles the order, and returns `ALREADY_SETTLED`. `useInitiatePayment` invalidates `["orders"]`
on that error, so `OrderDetailBody` refetches and the panel is replaced by the normal placed-order
view; `PendingPaymentPanel` shows a positive "already went through — refreshing" note and disables
its buttons in the meantime rather than a red error.
