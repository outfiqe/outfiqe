# Saved Sizes

## Purpose

A person's own sizes, one per kind of clothing (product type), such as "M for kurtas, 40 for
footwear". They are private to that person. When nothing is saved for a kind of clothing, the API
also reports the size they last bought in it, so the app can suggest it and offer to save it.

## Structure

- `saved-size.routes.ts` — `GET /me`, `PUT /me/:productTypeId` with `{ sizeLabel }`,
  `DELETE /me/:productTypeId`. All need a signed-in person; changes are rate-limited per person.
- `saved-size.controller.ts` — auth principal → service. Every change answers with the full list,
  so the app can replace its copy in one go.
- `saved-size.service.ts` — joins product types, saved sizes and last-bought sizes into one list,
  and refuses sizes the kind of clothing isn't offered in (`422 UNKNOWN_SIZE`).
- `saved-size.repository.ts` — reads active product types with their size options and this
  person's saved size, the last-bought size per type (raw SQL, `DISTINCT ON`), and writes rows.
- `saved-size.schemas.ts`, `saved-size.types.ts` — request validation and response shapes.

## Funnel

**User-facing:** in account settings → My sizes, a person picks their size for each kind of
clothing. If they have bought something before, the row suggests that size with a "Save" button.
Outfit boards then say "Your size M: in stock" on each item.

**Technical:** `saved-size.routes.ts` → `saved-size.controller.ts` → `saved-size.service.ts` →
`saved-size.repository.ts` → Postgres (`saved_sizes`, primary key `(user_id, product_type_id)`, both
foreign keys `ON DELETE CASCADE`; last-bought sizes come from `orders` and `order_items`).

## Non-obvious rationale

- **Sizes are stored as the label, not as a size option id.** Admins can rename or reorder size
  options, and product sizes are labels too, so the label is what matches a product's sizes.
  Saving checks the label against the type's current size options.
- **"Last bought" is worked out on every read, not stored.** It counts orders that were paid or
  are cash on delivery and weren't cancelled. The query is one indexed pass per person, and
  storing it would mean keeping a copy in sync with every order change.
- **Nothing is saved automatically.** Using a last-bought size silently would be a guess; the app
  shows it as a suggestion and the person chooses to save it.
