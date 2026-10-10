# Fit profile — a shopper's own height and weight

## Purpose

A signed-in person's height (cm) and weight (kg), saved only when they choose to. The web app uses
them to prefill the "Find my size" modal and the "Find what fits me" page, and to work out which
size of each item on an outfit board fits them. It replaces the old "My sizes" (one size label per
kind of clothing), because sizes are now set by each brand: a label like "L" means something
different at every brand, while height and weight don't.

## Structure

- `fitProfile.routes.ts` — `GET /me`, `PUT /me` with `{ heightCm, weightKg }`, `DELETE /me`. Any
  signed-in person; changes are rate-limited per person.
- `fitProfile.controller.ts` — auth principal → service.
- `fitProfile.service.ts` — read, save (upsert) and remove.
- `fitProfile.repository.ts` — Prisma reads and writes on `user_fit_profiles`.
- `fitProfile.schemas.ts` — whole numbers within the bounds shared with size charts
  (`FIT_HEIGHT_CM_MIN`/`MAX`, `FIT_WEIGHT_KG_MIN`/`MAX` in `@outfiqe/utils`).
- `fitProfile.types.ts` — the response shape.

## Funnel

**User-facing:** in account settings → My measurements, a person enters their height and weight
and saves them, or removes them. After a recommendation in the "Find my size" modal, a signed-in
person can also choose "Save to my account".

**Technical:** `fitProfile.routes.ts` → `fitProfile.controller.ts` → `fitProfile.service.ts` →
`fitProfile.repository.ts` → Postgres (`user_fit_profiles`, primary key `user_id`, `ON DELETE
CASCADE` with the user, CHECK `user_fit_profiles_measurements_valid` on the bounds).

## Non-obvious rationale

- **Its own table, not columns on `users`.** Body measurements are personal data; keeping them out
  of `users` means no existing `select` or `include` on a user can return them by accident. Only
  `GET /me` reads them, and only for the person themselves.
- **Never saved without asking.** The modal and the fit page keep guests' measurements in the
  browser only; the server stores them only after an explicit save.
- **Not the same as `User.heightCm`.** That column is a muse's public height, shown on their looks
  when they allow it. The web app may use it to prefill height, but it never copies it here.
