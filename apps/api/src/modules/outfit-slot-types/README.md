# outfit-slot-types

## Purpose

The admin-managed list of slot types an Outfit Build starts with (Top, Bottom, Full Outfit,
Footwear, Accessory, Extra, and any an admin adds). Each slot type says which garment types
(`ProductType`) can fill it, how many items it holds, and which other slots it can't be filled at
the same time as.

## Structure

- `outfit-slot-type.routes.ts` — admin routes under `/api/outfit-slot-types`: `GET /admin`,
  `POST /`, `PATCH /:id`, `POST /reorder`. Reading needs `platform:catalog:read` or
  `platform:catalog:manage`; every write needs `platform:catalog:manage`, the same guards as
  garment types.
- `outfit-slot-type.controller.ts` — thin handlers; each write is recorded in the platform audit
  log with its before and after values (`outfit-slot-type.created` / `.updated`,
  `outfit-slot-types.reordered`).
- `outfit-slot-type.service.ts` — the rules: linked garment types and blocked slot types must
  exist, a slot can't block itself, a slot needs at least one garment type unless it takes any
  garment type, keys are unique, and a reorder must list every slot type exactly once.
- `outfit-slot-type.repository.ts` — Prisma access. Create and update write the slot type and its
  link rows (`outfit_slot_type_product_types`, `outfit_slot_type_blocks`) in one transaction.
- `outfit-slot-type.schemas.ts` — strict zod bodies. `icon` must be one of `OUTFIT_SLOT_ICONS`
  from `@outfiqe/utils`; `key` can only be set on create.
- `outfit-slot-type.utils.ts` — `toOutfitSlotTypeView` (flattens the links, sorted by label) and
  `describeOutfitSlotTypeForAudit` (the readable before/after shape stored in the audit log).
- `outfit-slot-type.types.ts`, `outfit-slot-type.constants.ts` — shapes and field limits.

## Funnel

**User-facing**: an admin opens **Outfit slots** in the admin panel, adds or edits a slot type
(name, key, icon, how many items, which garment types fill it, which slots it can't share the
board with), switches one off, or drags the list into a new order. New builds start with the
active slot types in that order.

**Technical**: `apps/admin/src/features/outfit-slot-types` → `/api/outfit-slot-types` →
`platformGuards.catalog*` → `validate` → controller → service → repository → Postgres, then
`platformAudit.record`.

## Non-obvious rationale

- **Builds copy their slots.** When a build is created it copies every active slot type into its
  own `outfit_slots` rows (key, label, icon, item count, garment type ids, blocked keys). That is
  why editing or switching off a slot type here never changes a build already in progress, and why
  slot types are switched off rather than deleted.
- **Blocks are stored one way and apply both ways.** Full Outfit stores that it blocks Top and
  Bottom; the shared rule (`areSlotsExclusive` in `@outfiqe/utils`) also stops Full Outfit being
  filled while Top is. The view returns both `blocksSlotTypes` and `blockedBySlotTypes` so the
  admin page can show the relationship from either side.
- **The defaults live in the migration, not only the seed.** `20260929200000_add_outfit_build_data_model`
  inserts the six default slot types, the five garment types they need (footwear, accessories,
  saree, kurta set, lehenga) and their sizes, skipping any that already exist. Production has
  never been seeded, so every environment gets working defaults from migrations alone.
- **The total item cap is a setting, not a slot type field.** "Items per board"
  (`outfit.maxItemsPerBoard`) lives in platform settings with the other Outfit Build limits.
