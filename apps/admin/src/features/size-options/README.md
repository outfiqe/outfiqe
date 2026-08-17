# Size options

## Purpose

Admin CRUD for the size catalog a brand picks from when adding a product (`S`/`M`/`L`/`XL`, etc.), scoped per product type. Mirrors `../categories` — an admin-owned taxonomy list, not something the brand types in freehand.

## Structure

- `SizeOptionsPage.tsx` — the page: a product-type tab selector, an add-size form, and a delete-able list scoped to the selected type.
- `api.ts` — `sizeOptionsApi` (`list`/`create`/`remove`).
- `schemas.ts` — `SizeOption` zod schema and the shared `ProductTypeSlug` re-export.

## Funnel

**User-facing**: pick a product type tab, type a size label, add it. Existing sizes for that type list below with a delete button each.

**Technical**: `SizeOptionsPage` → `sizeOptionsApi` → `GET/POST/DELETE /api/size-options` (admin-gated) → `apps/api/src/modules/size-options`. There's no edit — a size is add-or-delete only, matching how small a taxonomy entry this is (a single label).
