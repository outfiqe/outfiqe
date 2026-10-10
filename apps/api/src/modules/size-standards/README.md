# Size standards — each brand's own size scales

## Purpose

A brand's own size scales, such as "Tops – letter" (S, M, L, XL) or "Waist" (28, 30, 32). Outfiqe
doesn't define sizes: an "L" at one brand can be an "XL" at another, so every product's sizes come
from one of its brand's standards, and shoppers get recommendations from the height and weight
range the brand sets on each size (see `../products/README.md`, "Size charts").

## Structure

- `sizeStandard.routes.ts` — `GET /` (the brand's active standards), `POST /`, `PATCH /:id`,
  `DELETE /:id` (archive). Brand owners only; changes are rate-limited per person.
- `sizeStandard.controller.ts` — auth principal → service.
- `sizeStandard.service.ts` — resolves the caller's brand, refuses standards that aren't theirs
  (404), turns a duplicate name into `409 SIZE_STANDARD_NAME_TAKEN`, and exposes
  `getOwnedLabelsInStandardOrder` for the products module to resolve the sizes a brand picked.
- `sizeStandard.repository.ts` — Prisma reads and writes on `brand_size_standards` and
  `brand_size_standard_labels`.
- `sizeStandard.schemas.ts` — name 1–60 characters; 1–20 sizes of 1–12 characters, trimmed, no two
  that differ only by case.
- `sizeStandard.types.ts` — response shapes.

## Funnel

**User-facing:** in the brand dashboard, a brand owner creates a size standard (a name and its
sizes in order), then picks it when adding a product and ticks the sizes that product comes in.
They can rename it, reorder or change its sizes, or archive it.

**Technical:** `sizeStandard.routes.ts` → `sizeStandard.controller.ts` → `sizeStandard.service.ts`
→ `sizeStandard.repository.ts` → Postgres. Product creation calls
`sizeStandardService.getOwnedLabelsInStandardOrder` and copies each picked label onto the new
`ProductSize`.

## Non-obvious rationale

- **Products copy labels; nothing points back at a label.** `ProductSize.label` is a copy, as it
  was with the old admin catalog, so renaming, removing or reordering a standard's sizes, or
  archiving the standard, never changes a product that already exists. `Product.sizeStandardId`
  only records which standard the brand used, for the edit form.
- **Archive, don't delete.** Archived standards disappear from the brand's list but keep the
  products' link. The name is unique per brand among active standards only (a partial unique index,
  `brand_size_standards_active_brand_id_name_key`, which Prisma can't model), so a brand can archive
  "Letter" and make a new "Letter".
- **Editing sizes keeps the ids of sizes that stay.** `PATCH` with `labels` deletes the sizes that
  are gone and upserts the rest by `(standardId, label)`, so a brand form holding a label id for a
  kept size still works after a reorder.
- **Someone else's standard is a 404, never a 403,** so standard ids can't be probed across brands.
