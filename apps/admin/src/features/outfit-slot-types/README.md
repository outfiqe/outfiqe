# outfit-slot-types

## Purpose

The **Outfit slots** admin page: the list of slot types every new Outfit Build starts with, in
order, and the form to add or edit one.

## Structure

- `OutfitSlotTypesPage.tsx` — the list: each row shows the slot's icon, name, on/off badge, key,
  how many items it holds, which garment types fill it and which slots it can't share the board
  with. Rows reorder by drag or by the up/down buttons (`useDragReorder`), with an optimistic
  order that rolls back if saving fails. Loading, empty and error states are shown.
- `SlotTypeFormModal.tsx` — the create/edit form (react-hook-form + zod) in a design-system
  `Modal`. The key fills itself from the name until edited by hand, and can't change once
  created.
- `slotTypeForm.schema.ts` — the form's zod schema, its empty values and
  `toSlotTypeFormValues` for editing.
- `api.ts`, `schemas.ts` — the API client and response schema.
- `outfitSlotTypes.constants.ts` — query keys (it shares `admin-product-types` with the garment
  types page, so both stay in step).

## Funnel

**User-facing**: an admin with catalog access opens **Outfit slots**, taps **New slot type** or
**Edit**, fills in the form and saves; or switches a slot off; or drags the list into a new
order. Admins with read-only catalog access see the list without the editing controls.

**Technical**: `OutfitSlotTypesPage` / `SlotTypeFormModal` → `outfitSlotTypesApi` →
`/api/outfit-slot-types` → `apps/api/src/modules/outfit-slot-types`.

## Non-obvious rationale

- **A slot that takes any garment type sends an empty garment list**, even if some were picked
  before the switch was turned on, so the saved slot and the page never disagree.
- **Icons come from a fixed set** (`OUTFIT_SLOT_ICONS` in `@outfiqe/utils`), drawn by the
  design-system `OutfitSlotIcon`, so the web board can draw exactly what admins picked.
