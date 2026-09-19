# products

## Purpose

The product review queue: browse pending/approved/rejected products (optionally filtered to
thrift-only listings), approve or reject a pending one, and open a product's full detail —
a bigger image plus everything the list row summarizes — without leaving the page.

## Structure

- `ProductsPage.tsx` — status tabs, the thrift-only toggle, the product list, and the
  approve/reject actions. Clicking a row's image/name area opens `ProductDetailModal`; the
  approve/reject buttons on the row stay separate sibling controls so they don't also trigger
  the row's click.
- `ProductDetailModal.tsx` — the expanded view for one product: a larger image pane next to the
  same info the row shows (status, price, brand, type/categories, thrift condition), plus
  Approve/Reject when the product is still `PENDING`. Takes the already-fetched `Product` object
  as a prop — no separate detail fetch, since `productSchema` already carries everything this
  view needs.
- `hooks/useInfiniteProducts.ts` — cursor pagination via the shared `useInfiniteCursorPage`
  equivalent for this app.
- `api.ts`, `schemas.ts` — `productsApi` (`list`/`approve`/`reject`) and the `Product` shape.

## Funnel

**User-facing:** a moderator picks a status tab (and optionally the Thrift toggle) to narrow the
queue, clicks a product to see it larger with its full details, and approves or rejects it either
from the row or from the open detail modal.

**Technical:** `ProductsPage` derives `detailProduct` by looking up `detailProductId` in the
already-fetched `products` list (same pattern `ExploreFeed`/`CreatorProfile` use on the storefront
for their own detail modals) rather than holding a separate copy of the clicked product — so once
an approve/reject mutation invalidates the list and it refetches, the modal's content stays in
sync automatically, and if the approved/rejected product no longer matches the current tab filter
it simply disappears from `products`, closing the modal with no extra effect needed.

## Non-obvious rationale

**The thrift filter's URL value is `?thrift=true`, not `?thrift=thrift`.** The toggle used to
encode its own "on" state as the literal string `"thrift"` — the same word as the query key
itself — producing a tautological-looking `?thrift=thrift` in the URL. `oneOfFilter`'s allowed
values just need to not collide with the key; every other `oneOfFilter` filter in this app (e.g.
`assignee=all|me|unassigned` in `support`) already avoids reusing the key as a value. Renamed to
the standard boolean-flag spelling (`"all" | "true"`) to match that convention — same mechanism,
just a value that doesn't visually double as the key.
