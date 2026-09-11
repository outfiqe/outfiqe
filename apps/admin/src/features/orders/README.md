# Orders (admin)

## Purpose

The platform-wide order list and single-order view for admin staff: browse every order, filter by
fulfilment status, open one to see its items, payment transactions and address, and advance or
cancel its fulfilment.

## Structure

- `OrdersPage.tsx` — the routed list (`/orders`). Status tabs (All / Placed / Packed / Shipped /
  Delivered / Cancelled) bound to the URL via `@/lib/useSearchFilter` as `?status=` (the default
  "All" is omitted); `_authenticated.orders.index.tsx` declares the matching `validateSearch`.
  Each row links to `/orders/$orderId`. Cursor-paginated "Load more" via `useInfiniteOrders`.
- `OrderDetailPage.tsx` — one order (`/orders/$orderId`): buyer + address, line items, payment
  transaction history, the forward-only fulfilment-status control, and a cancel-with-reason modal.
- `hooks/useInfiniteOrders.ts` — `useInfiniteCursorPage` over `ordersApi.list`, keyed by
  `["admin-orders", status]` so each status filter caches independently.
- `hooks/useOrder.ts` — the single-order `useQuery`.
- `api.ts` — `ordersApi`: `list(status?, cursor?)`, `get(id)`, `advanceFulfilment(id, status)`,
  `cancel(id, reason)`, each parsing the response through a Zod schema.
- `schemas.ts` — Zod mirrors: `adminOrderSchema` (full) and `adminOrderSummarySchema` (list row).
- `orderStatusTone.ts` — payment/fulfilment status → `Badge` tone maps.

## Funnel

**User-facing:** an admin opens Orders from the Platform nav, optionally picks a fulfilment-status
tab (the choice lands in the URL, so a refresh or a shared link keeps it), and clicks an order to
work it — advancing PLACED → PACKED → SHIPPED → DELIVERED one step at a time, or cancelling with a
reason (which triggers any refund handling on the API side).

**Technical:** `OrdersPage`/`OrderDetailPage` → `hooks/*` → `api.ts` → `apiClient` →
`GET /api/orders/admin`, `GET /api/orders/admin/:id`, `PATCH /api/orders/admin/:id/fulfilment`,
`POST /api/orders/admin/:id/cancel` → `apps/api/src/modules/orders`.
