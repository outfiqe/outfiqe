# Products — inventory

## Stock decrement is atomic, not check-then-write

`decrementStock` runs a single conditional `UPDATE ... WHERE stock >= qty`. Postgres's row lock on that statement is the only correctness mechanism — there's no separate `SELECT` beforehand, so two concurrent buyers of the last unit can't both pass a check and then both write. Verified under real concurrent load: 20 parallel requests against a size with 12 in stock resolved to exactly 12 successes, 0 oversold.

`decrementStock`/`restoreStock` take a `DbClient` (either the default `prisma` client or a `Prisma.TransactionClient`) so a caller building a larger atomic operation — order creation, in particular — can pass its own `$transaction` handle and get the stock write composed into that same transaction.

`decrementStockForItems`/`restoreStockForItems` (in `product.service.ts`) process multi-item lines sorted by `sizeId`. This isn't cosmetic: two transactions that lock the same set of `ProductSize` rows in different orders can deadlock under Postgres; sorting first guarantees every caller acquires locks in the same order.

## Low stock is computed, not stored

`Product.lowStock` and `ProductSize.inStock` are still columns in the schema (existing brand/admin flows write to them), but the `products` module no longer reads them for anything customer-facing. Instead, `totalStock` is summed live from `ProductSize.stock` at query time, and `lowStock`/`inStock` are derived from that (`isLowStock`, `stock > 0`). A stored flag can drift from the real stock count; a live sum can't.

`toPublicProduct` still accepts a plain `ProductWithBrand` without `totalStock` — three other modules (`collections`, `creator-looks`, `wishlist`) construct their own product data and call this mapper without fetching stock. Rather than force that fetch onto unrelated modules, `toPublicProduct` falls back to the legacy `product.lowStock` column when `totalStock` isn't supplied. Those call sites will show live-computed low stock once they're migrated to select it too — not yet done.
