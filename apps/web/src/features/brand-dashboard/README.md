# Brand dashboard

## Purpose

The signed-in brand owner's workspace: manage the brand profile, list/create/edit/delete products, manage stock, and view orders containing the brand's items. One page (`/dashboard/profile`) — no separate "Products" tab.

## Structure

- `components/BrandProfileView.tsx` — the whole page: profile header (banner/avatar/contact info, edit modal) with `ProductsSection` rendered directly beneath it, mirroring how `creator-profile`'s `CreatorProfile.tsx` puts the posts grid right under the profile header rather than behind a separate route.
- `components/ProductsSection.tsx` / `ProductModal.tsx` / `EditProductModal.tsx` + `EditProductForm.tsx` / `SizeStockFields.tsx` / `StockModal.tsx` / `ProductActionsMenu.tsx` — product listing, the "Add a product" form, the edit form (same fields, pre-filled), the restock modal, and the per-card 3-dot menu (Edit / Manage stock / Delete).
- `components/OrdersSection.tsx` — read-only list of orders containing this brand's items, still its own page (`/dashboard/orders`) — unaffected by the profile/products merge.
- `api/brandDashboardApi.ts`, `brandProductsApi.ts`, `brandOrdersApi.ts` (+ matching `*Schemas.ts`) — one API/schema pair per sub-area.
- `hooks/` — one hook per mutation/query (`useCreateProduct`, `useUpdateProduct`, `useAdjustStock`, `useDeleteProduct`, `useBrandProducts`, `useBrandOrders`, `useUpdateBrandProfile`).
- `schemas/productForm.schema.ts` — `productFormSchema` (create) and `buildEditProductFormSchema` (edit — a factory, not a static schema; see below).

## Funnel

**User-facing**: sign in as a brand owner → `/dashboard/profile` shows the brand's profile card, then the product grid right below it. "Add product" opens a modal (photos, name, price, type, sizes + per-size stock, categories) → submit for review. Each product card has a 3-dot menu: "Edit" opens the same fields pre-filled, changes apply immediately even on a live product; "Manage stock" opens a modal listing sizes with a running count and an "adjust by" input per size; "Delete" asks for confirmation, then removes it.

**Technical**: `ProductModal` → `useCreateProduct` → `POST /products`. `EditProductForm` → `useUpdateProduct` → `PATCH /products/:id`. `StockModal` → `useAdjustStock` → `PATCH /products/:id/stock`. `ProductActionsMenu`'s Delete → confirmation `Modal` in `ProductsSection` → `useDeleteProduct` → `DELETE /products/:id` (soft delete — see `apps/api/src/modules/products/README.md`). The size picker (`SizeStockFields`, shared by create and edit) is fed by `apps/web/src/features/products/hooks/useSizeOptions`, reading the admin-owned catalog (`apps/api/src/modules/size-options`) filtered to whichever product type is currently selected.

## Non-obvious rationale

**Sizes are picked, not typed.** Neither form lets a brand type a size label — it fetches that product type's admin-defined size list and the brand checks off which ones apply, entering a stock count for each.

**Editing applies immediately, even to a live product — deliberately.** There's no re-review step. A brand can change name/price/photos/categories/type on an `APPROVED` product and it's live with the new values right away. This trades a small content-drift risk (a brand could swap in different photos post-approval without anyone re-checking) for not making a brand wait on an admin to fix a typo or update a price. Stock and delete already worked this way; edit now matches them for consistency — restocking, editing, and deleting are all "operational" actions a brand should self-serve, unlike creating a product in the first place, which still goes through review.

**Changing a product's type means re-picking its sizes, and it can fail.** `EditProductForm` only shows the size picker when the selected type differs from the product's original type (`buildEditProductFormSchema(originalType)` — a schema _factory_, not a static schema, because "sizes required" depends on that original value, which zod can't see on its own). Submitting a type change only sends `sizes` when `type !== originalType`; otherwise the size list submitted is `undefined` and the product's current sizes are left untouched entirely — they're not re-validated or re-fetched, since they're not part of what's being edited. If any of the sizes being replaced already has order history, the API rejects the whole edit with a 409 (surfaced via `FormBanner`) rather than silently dropping just the sizes that couldn't be removed — see `apps/api/src/modules/products/README.md` for why that's a hard DB-level constraint, not a validation choice.

**Deleting a live product is allowed too, same reasoning as edit.** The confirmation modal's copy changes for `APPROVED` products specifically, since that's the one case where the effect is immediately visible to shoppers, not just internal.

**Profile and products share a page because they're the same kind of thing.** This mirrors `creator-profile` exactly: a creator's profile page _is_ their posts grid with a header on top, not a separate "My posts" tab. `/dashboard/products` no longer exists; `DashboardSidebar`'s brand nav dropped the "Products" item accordingly.
