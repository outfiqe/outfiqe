# Products — inventory

## Stock decrement is atomic, not check-then-write

`decrementStock` runs a single conditional `UPDATE ... WHERE stock >= qty`. Postgres's row lock on that statement is the only correctness mechanism — there's no separate `SELECT` beforehand, so two concurrent buyers of the last unit can't both pass a check and then both write. Verified under real concurrent load: 20 parallel requests against a size with 12 in stock resolved to exactly 12 successes, 0 oversold.

`decrementStock`/`restoreStock` take a `DbClient` (either the default `prisma` client or a `Prisma.TransactionClient`) so a caller building a larger atomic operation — order creation, in particular — can pass its own `$transaction` handle and get the stock write composed into that same transaction.

`decrementStockForItems`/`restoreStockForItems` (in `product.service.ts`) process multi-item lines sorted by `sizeId`. This isn't cosmetic: two transactions that lock the same set of `ProductSize` rows in different orders can deadlock under Postgres; sorting first guarantees every caller acquires locks in the same order.

## Low stock is computed, not stored

`Product.lowStock` and `ProductSize.inStock` are still columns in the schema and `create` still writes a best-effort `inStock` at creation time, but the `products` module no longer reads either column for anything customer-facing. Instead, `totalStock` is summed live from `ProductSize.stock` at query time, and `lowStock`/`inStock` are derived from that (`isLowStock`, `stock > 0`). A stored flag can drift from the real stock count; a live sum can't.

`toPublicProduct` still accepts a plain `ProductWithBrand` without `totalStock` — three other modules (`collections`, `creator-looks`, `wishlist`) construct their own product data and call this mapper without fetching stock. Rather than force that fetch onto unrelated modules, `toPublicProduct` falls back to the legacy `product.lowStock` column when `totalStock` isn't supplied. Those call sites will show live-computed low stock once they're migrated to select it too — not yet done.

## Sizes come from the admin-owned catalog, not free text

`createProductSchema.sizes` is `{ sizeOptionId, stock }[]`, resolved server-side against `sizeOptionService.getManyByIds` (see `../size-options/README.md`) — a brand picks from the admin's per-product-type size list, it doesn't type a label. `ProductSize.label` is still a plain denormalized string, though: `create()` copies the `SizeOption.label` onto the new `ProductSize` row once and never links back to it. Renaming or deleting a `SizeOption` later never mutates an already-created product's sizes — matches how a product's name/price also don't retroactively change when unrelated catalog data changes.

## Restocking, editing, and deleting all work regardless of status

`PATCH /products/:id/stock` (`productService.adjustStock`), `PATCH /products/:id` (`productService.update`), and `DELETE /products/:id` (`productService.delete`) all used to be — or in `update`'s case, still could reasonably have been — locked once a product went `APPROVED`, on the theory that a live listing shouldn't quietly change after admin reviewed it. That lock was removed everywhere: a brand can restock, edit, or pull a live product at any time, no re-review required. The tradeoff (a brand could swap in different photos/copy post-approval without anyone re-checking) was accepted deliberately in favor of self-serve control — see this module's owning feature docs (`apps/web/src/features/brand-dashboard/README.md`) for the product-level reasoning.

`adjustStock` reuses `decrementStock`/`restoreStock` directly (a positive `delta` restores, a negative one decrements and 409s if it would go below 0) inside a `$transaction`, sorted by `sizeId` for the same deadlock-avoidance reason as `decrementStockForItems` above. It only ever touches sizes it first confirms belong to the caller's own product.

## Editing a product's type replaces its sizes — and can fail if they've sold

Whether sizes need replacing isn't decided by whether `type`/`sizes` are present in the request body — a client that always submits the full form (the normal case) sends `type` on every edit regardless of whether it actually changed. `productService.update` instead compares the submitted `type` against the product's _current_ type (already fetched via `requireOwnedProduct`) and only treats it as a real type change — requiring `sizes` and resolving the new `sizeOptionId`s the same way `create` does — when they differ. (An earlier version of this used a schema-level `.refine` keyed on field presence instead; it rejected every ordinary edit that happened to include an unchanged `type`, since `sizes` would then legitimately be absent. Comparing against the DB row's real value is the only version of this check that's actually correct.) When a real type change does need new sizes, `productRepository.update` performs `sizes: { deleteMany: {}, create: [...] }` as one nested write inside the same `prisma.product.update` call.

That `deleteMany` can fail: `OrderItem.size` is `onDelete: Restrict`, so Postgres refuses to delete a `ProductSize` row that's ever been ordered. Rather than pre-checking every size for order history (a second round trip, and still racy), `update` just attempts the write and catches the resulting foreign-key error (`isForeignKeyConstraintError`), turning it into a plain `SIZES_IN_USE` 409 — "some of its current sizes already have orders and can't be removed." The brand's only path forward there is to leave the type as-is; there's no partial-replace or force option, on purpose, since silently keeping some old sizes around after a type change would be confusing (they'd belong to the wrong type's catalog).

## Delete is soft

`OrderItem.product` is also `onDelete: Restrict`, so a real `DELETE` was never an option once a product has sold even once. `Product.deletedAt` (mirroring `CreatorLook`'s existing soft-delete column) is set instead by `DELETE /products/:id`, and every customer/brand/admin-facing read (`listPublic`, `listTrending`, `listNewArrivals`, `findPublicById`, `listByBrandId`, `listForReview`, `countPublic`, `findApprovedByIds`) filters `deletedAt: null`. Nothing references `Product` by a foreign key that would need cleanup on a soft delete — `sizes`/`images`/`cartItems` etc. would all cascade on a _real_ delete, but a soft delete never triggers that, so they're simply orphaned-but-invisible.

`requireOwnedProduct`/`requirePendingProduct` both treat an already-deleted product as `NOT_FOUND`, so a second delete, an `update`, or `adjustStock` against it all fail the same way a nonexistent product would. `order.service.ts`'s Buy Now path (see `../orders/README.md`) also checks `deletedAt` directly alongside `status`, since it reads the product independently of these listing queries.
