# product-types

## Purpose

Lets the team manage the product types brands choose from (for example tops or footwear): add one, turn it on or off, and set the order they appear in.

## Structure

- `api/productTypesApi.ts` — list types (`GET /product-types/admin`), create, turn on/off (`PATCH /product-types/:id`), and save a new order (`POST /product-types/reorder`).
- `api/productTypesSchemas.ts` — Zod schemas for a product type.
- `components/ProductTypesPage.tsx` — the list with drag-to-reorder and the create form. Editing controls show only with the catalog manage permission.
- `schemas/productTypeForm.schema.ts` — validation for the create form (unit-tested beside it).
- `index.ts` — exports `productTypesApi`, `productTypeSchema` and the `ProductType` type for other features.

## Funnel

**User-facing:** an admin adds a product type, drags types into the order brands should see them, and turns off any that shouldn't be offered.

**Technical:** `routes/_authenticated.product-types.tsx` → `components/ProductTypesPage.tsx` → `api/productTypesApi.ts` → `apiClient` → `/api/product-types` in `apps/api/src/modules/product-types`.
