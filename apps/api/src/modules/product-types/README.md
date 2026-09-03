# Product types — admin-managed garment taxonomy

## Purpose

The list of garment types a product can be (`Tops`, `Bottoms`, … and anything an admin adds later
such as `Shoes` or `Accessories`). Admins create types, rename them, reorder them, and switch each
one on or off for the storefront. Replaces the old hardcoded `ProductType` Postgres enum. Mirrors
the `categories` module's shape — an admin-managed taxonomy table that other features read from,
never define themselves.

## Structure

- `product-type.routes.ts` — `GET /admin` (admin, every type incl. inactive), `GET /` (public,
  Redis-cached, active only), `GET /assignable` (brand-owner, active types that already have at
  least one `SizeOption`), `POST /` + `POST /reorder` + `PATCH /:id` (admin, each refreshing the
  public cache).
- `product-type.controller.ts` / `product-type.service.ts` / `product-type.repository.ts` —
  standard module layering.
- `product-type.schemas.ts` — `createProductTypeSchema` (`label`, lowercase-hyphen `slug`,
  `sortOrder?`, `isActive?`), `updateProductTypeSchema`, `reorderProductTypesSchema`.
- `product-type.types.ts` — `ProductTypeRecord`, `ProductTypeWithCounts` (adds `productCount` +
  `sizeOptionCount`).
- `product-type.utils.ts` — `toPublicProductType` mapper (`{ id, slug, label }`, the
  `@outfiqe/types` `PublicProductType` shape).

## Funnel

**User-facing**: an admin manages the list on the "Garment types" page — add a type, drag to
reorder, toggle it on/off. A new type only appears in a brand's product form once it is active
**and** the admin has added sizes for it on the Sizes page. Turning a type off hides it from the
storefront filter, the per-type storefront sections, and the brand product form; existing products
of that type stay in the database and reappear if the type is switched back on.

**Technical**: `apps/admin/src/features/product-types` → `/api/product-types/admin` +
`/reorder` + `PATCH`. Storefront: `apps/web` `useProductTypes` → `GET /api/product-types` (cached);
brand form: `useAssignableProductTypes` → `GET /api/product-types/assignable`. `products` and
`size-options` resolve a request's type slug to a `ProductType.id` through
`productTypeService.getBySlug` / `getActiveBySlug`.

## Non-obvious rationale

**`Product.productTypeId` is `ON DELETE RESTRICT`; there is no delete route.** Removing a type in
use would orphan products, so — like `categories` — the module has no delete. Deactivation is the
"remove it" path.

**The enum → table migration (`20260903193000_convert_product_type_to_table`) is order-sensitive.**
The search-vector trigger reads `products."type"`, so the `search_products` function and
`products_compute_search_vector` are rebuilt to key off `product_type_id` (and index the type's
`label`, via a new `product_types_cascade_search_vector` trigger that re-syncs on rename) _before_
the old `products."type"` column is dropped. The enum type itself is dropped last, once nothing
references it.

**Integration tests seed types with `#test/integration/productFixtures.ts#ensureProductType`.**
`resetDatabase()` truncates every table between tests, including the rows the migration seeds, so
tests that need a type upsert one rather than assuming the six defaults exist.
