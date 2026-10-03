# Orders (admin)

## Purpose

The platform-wide order list and single-order view for admin staff: browse every order, filter by
fulfilment status, open one to see its items, payment transactions and address, and advance,
cancel or mark it as returned.

## Structure

- `OrdersPage.tsx` — the routed list (`/orders`). Status tabs (All / Placed / Packed / Shipped /
  Delivered / Cancelled / Returned) bound to the URL via `@/lib/useSearchFilter` as `?status=`
  (the default "All" is omitted); `_authenticated.orders.index.tsx` declares the matching
  `validateSearch`. Each row links to `/orders/$orderId`. Cursor-paginated "Load more" via
  `useInfiniteOrders`.
- `OrderDetailPage.tsx` — one order (`/orders/$orderId`): buyer + address, line items, payment
  transaction history, the forward-only fulfilment-status control, a cancel-with-reason modal
  (placed or packed orders), and a "Mark as returned" modal (shipped or delivered orders).
- `hooks/useInfiniteOrders.ts` — `useInfiniteCursorPage` over `ordersApi.list`, keyed by
  `["admin-orders", status]` so each status filter caches independently.
- `hooks/useOrder.ts` — the single-order `useQuery`.
- `api.ts` — `ordersApi`: `list(status?, cursor?)`, `get(id)`, `advanceFulfilment(id, status)`,
  `cancel(id, reason)`, `markReturned(id, reason)`, each parsing the response through a Zod schema.
- `schemas.ts` — Zod mirrors: `adminOrderSchema` (full), `adminOrderSummarySchema` (list row) and
  `orderReturnOutcomeSchema` (what a return voided and whether anything was already paid out).
- `orderStatusTone.ts` — payment/fulfilment status → `Badge` tone maps.

## Funnel

**User-facing:** an admin opens Orders from the Platform nav, optionally picks a fulfilment-status
tab (the choice lands in the URL, so a refresh or a shared link keeps it), and clicks an order to
work it — advancing PLACED → PACKED → SHIPPED → DELIVERED one step at a time, cancelling with a
reason (which triggers any refund handling on the API side), or, when a parcel comes back,
marking it as returned with what happened. If earnings from that order were already paid out,
the page warns that they need recovering by hand.

**Technical:** `OrdersPage`/`OrderDetailPage` → `hooks/*` → `api.ts` → `apiClient` →
`GET /api/orders/admin`, `GET /api/orders/admin/:id`, `PATCH /api/orders/admin/:id/fulfilment`,
`POST /api/orders/admin/:id/cancel`, `POST /api/orders/admin/:id/return` →
`apps/api/src/modules/orders`.
