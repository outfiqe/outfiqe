# saved-sizes

## Purpose

"My sizes": a person's own size for each kind of clothing, kept private to them. Outfit builds use
it to say whether each item comes in their size. Everything here is in English and Nepali (see
`../../i18n`).

## Structure

- `api/savedSizesApi.ts` — the `/api/saved-sizes/me` client and zod schema. Every change answers
  with the full list.
- `hooks/useSavedSizes.ts`
  - `useSavedSizes` — the list (`["saved-sizes", "me"]`), only fetched when signed in.
  - `useMySizeByProductType` — product type id → the size to use: the saved size, or else the
    size last bought in that type.
  - `useChangeSavedSize` — save or clear one size, replace the cached list with the answer, and
    say so in a toast.
- `components/MySizesSettings.tsx` — one row per kind of clothing: a size picker, a clear button,
  and "You last bought M. Save M" when nothing is saved yet. Loading, error-with-retry and empty
  states.

Route: `app/(dashboard)/settings/sizes/page.tsx` ("My sizes" in the dashboard nav for shoppers and
creators).

## Funnel

**User-facing:** open My sizes, pick a size for each kind of clothing (or tap the suggested size
from a past order). On an outfit board, each item then says "Your size M: in stock", "Your size
M: sold out", or "Not made in your size (M)".

**Technical:** `MySizesSettings` → `useSavedSizes` / `useChangeSavedSize` → `savedSizesApi` →
`/api/saved-sizes/me` → `apps/api/src/modules/saved-sizes`. The board reads
`useMySizeByProductType` in `outfit-build/components/BuildBoard.tsx` and passes it to `SlotCard`.

## Non-obvious rationale

- **A last-bought size counts for the board even when it isn't saved.** It's the best guess
  there is, and it's only used to label items. It is never saved without the person choosing to.
