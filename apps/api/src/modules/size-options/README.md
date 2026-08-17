# Size options — admin-owned size catalog

## Purpose

The list of sizes a brand can pick from when adding a product (e.g. `S`/`M`/`L`/`XL` for tops, a different set for headwear), scoped per `ProductType`. Admin creates and deletes entries; the brand's product-creation form reads them to build its size picker. Mirrors the `categories` module's shape: an admin-managed taxonomy table a brand's form pulls from, not something the brand defines itself.

## Structure

- `size-option.routes.ts` — `GET /admin` (admin, all types), `GET /` (brand-owner, `?type=` filtered), `POST /` (admin), `DELETE /:id` (admin).
- `size-option.controller.ts` / `size-option.service.ts` / `size-option.repository.ts` — standard module layering.
- `size-option.schemas.ts` — validation, including `type` as the public `ProductTypeSlug` (converted to/from the Prisma `ProductType` enum via `products/product.constants.ts`, the same conversion the `products` module already does).
- `size-option.types.ts` — `SizeOptionRecord`/`CreateSizeOptionInput`.

## Non-obvious rationale

**No foreign key from `ProductSize` to this table.** A `ProductSize` row still just stores a plain `label` string, copied from the chosen `SizeOption` at product-creation time (see `../products/README.md`). Deleting or renaming a `SizeOption` is therefore always safe — nothing references it, so there's no cascade risk and no "can't delete, it's in use" case to handle. The tradeoff is that `SizeOption` is purely a UI picker, not a source of truth for any existing product's sizes.

**Type-scoped, not a single flat list.** Sizes genuinely differ by product type (tops vs. headwear, for one), so `SizeOption` carries a `type` and is unique on `(type, label)` — the same label ("M") can exist independently per type.

## Funnel

**User-facing**: an admin adds sizes per product type on the Sizes page. A brand, filling out "Add a product," picks a type first, then sees that type's size list and checks off which sizes the product comes in, entering a stock count for each.

**Technical**: `apps/admin/src/features/size-options` (admin CRUD) → `POST/DELETE /api/size-options` → this module. `apps/web/src/features/products/hooks/useSizeOptions.ts` → `GET /api/size-options?type=` → this module → consumed by `apps/web/src/features/brand-dashboard/components/ProductModal.tsx`'s size picker, which submits chosen `sizeOptionId`s to `POST /api/products` (see `../products/product.service.ts#create`, which resolves them via `sizeOptionService.getManyByIds`).
