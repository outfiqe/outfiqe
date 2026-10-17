# Orders (admin)

## Purpose

The platform-wide order list and single-order view for admin staff: browse every order, filter by
fulfilment status, open one to see its items, payment transactions and address, and advance,
cancel or mark it as returned. Staff can also refund single items, pay out refunds that
couldn't go back automatically, and review items a brand says it can't supply.

## Structure

- `components/OrdersPage.tsx` — the routed list (`/orders`). Status tabs (All / Placed / Packed / Shipped /
  Delivered / Cancelled / Returned) bound to the URL via `@/lib/useSearchFilter` as `?status=`
  (the default "All" is omitted); `_authenticated.orders.index.tsx` declares the matching
  `validateSearch`. Each row links to `/orders/$orderId`. Cursor-paginated "Load more" via
  `useInfiniteOrders`.
- `components/OrderDetailPage.tsx` — one order (`/orders/$orderId`): buyer + address, line items, payment
  transaction history, the forward-only fulfilment-status control, a cancel-with-reason modal
  (placed or packed orders), a "Mark as returned" modal (shipped or delivered orders), a "Refund
  items" button (any order with units not yet refunded), each line's refunded count, and the
  order's refunds (`refunds/components/OrderRefundsCard.tsx`).
- `hooks/useInfiniteOrders.ts` — `useInfiniteCursorPage` over `ordersApi.list`, keyed by
  `["admin-orders", status]` so each status filter caches independently.
- `hooks/useOrder.ts` — the single-order `useQuery`.
- `api/ordersApi.ts` — `ordersApi`: `list(status?, cursor?)`, `get(id)`, `advanceFulfilment(id, status)`,
  `cancel(id, reason)`, `markReturned(id, reason)`, each parsing the response through a Zod schema.
- `api/ordersSchemas.ts` — Zod mirrors: `adminOrderSchema` (full), `adminOrderSummarySchema` (list row) and
  `orderReturnOutcomeSchema` (what a return voided and whether anything was already paid out).
- `utils/orderStatusTone.ts` — payment/fulfilment status → `Badge` tone maps.

### `refunds/` topic

- `components/RefundItemsModal.tsx` — choose units per line (up to `qty - refundedQty`), a cause
  (staff adjustment, brand couldn't supply, failed hub inspection, customer refused delivery), a
  note, and whether to put the units back on sale. Sent with an `Idempotency-Key` that
  `hooks/useRefundOrderItems.ts` keeps until a success, so a double click or retry refunds once.
- `components/OrderRefundsCard.tsx` — the order's refunds: amount, cause, how the money went back,
  lines, delivery-fee share and any transfer reference. Has its own empty state.
- `components/RefundQueuePage.tsx` + `RefundQueueCard.tsx` — the `/orders/refunds` queue
  ("Refunds to pay"): every refund waiting for a manual transfer, with the customer's payout
  details. A bank account shows its last 4 digits until "Show full account number" (that call is
  audit-logged on the API). "Mark as paid" asks for the transfer reference and is disabled until
  the customer has added their details; it is hidden from staff without `platform:orders:manage`.
- `hooks/useOrderRefunds.ts`, `useInfiniteRefundQueue.ts`, `useMarkRefundPaid.ts`,
  `api/refundsApi.ts`, `api/refundsSchemas.ts`, `constants/refundLabels.ts`,
  `constants/refundQueryKeys.ts`.

### `unavailable-items/` topic

- `components/UnavailableItemsPage.tsx` — the `/orders/unavailable-items` queue ("Can't supply" in
  the sidebar): brand reports by status (To review / Approved / Rejected, in the URL as
  `?status=`). "Approve and refund" refunds the customer for those units; "Reject" asks for a note
  the brand sees.
- `hooks/useInfiniteUnavailableItems.ts`, `useDecideUnavailableItem.ts`,
  `api/unavailableItemsApi.ts`, `api/unavailableItemsSchemas.ts`,
  `constants/unavailableItemLabels.ts`.

Both queue pages sit under Orders in the sidebar (`adminSidebarNavItems.ts`) and use the orders
permission, so no new nav key or section permission is needed. Their paths are kept out of the
order-detail skeleton patterns in `components/page-skeletons`.

## Funnel

**User-facing:** an admin opens Orders from the Platform nav, optionally picks a fulfilment-status
tab (the choice lands in the URL, so a refresh or a shared link keeps it), and clicks an order to
work it — advancing PLACED → PACKED → SHIPPED → DELIVERED one step at a time, cancelling with a
reason (which triggers any refund handling on the API side), or, when a parcel comes back,
marking it as returned with what happened. If earnings from that order were already paid out,
the page warns that they need recovering by hand. To refund only some items they press "Refund
items". Refunds that can't go back on their own (eSewa, or a Khalti refusal) land in "Refunds to
pay": staff send the money to the account the customer gave and mark it paid with the transfer
reference, and the customer is told.

**Technical:** `OrdersPage`/`OrderDetailPage` → `hooks/*` → `api/ordersApi.ts` → `apiClient` →
`GET /api/orders/admin`, `GET /api/orders/admin/:id`, `PATCH /api/orders/admin/:id/fulfilment`,
`POST /api/orders/admin/:id/cancel`, `POST /api/orders/admin/:id/return`,
`GET`/`POST /api/orders/admin/:id/refunds`, `GET /api/orders/admin/refunds`,
`POST /api/orders/admin/refunds/:refundId/mark-paid`,
`GET /api/orders/admin/refunds/:refundId/account-number`,
`GET /api/orders/admin/unavailable-items`, `POST …/unavailable-items/:requestId/approve|reject` →
`apps/api/src/modules/orders`.
