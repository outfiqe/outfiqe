# Nepal Banks

## Purpose

Read-only reference data: the list of Nepali commercial banks, development banks, and finance
companies a user or brand can pick from when adding a payout bank account. The list itself is
never entered by a user — it's seeded once and cached.

## Structure

- `nepalBank.routes.ts` — `GET /` (authenticated, cached).
- `nepalBank.controller.ts` — reads the request, calls the service, sends the response envelope.
- `nepalBank.service.ts` — `listActive` for the public listing; `requireActiveBank` for other
  modules (`bank-accounts`, `brand-bank-accounts`) to validate a submitted `bankId`.
- `nepalBank.repository.ts` — Prisma queries against `NepalBank`.
- `nepalBank.types.ts` — the full DB-shaped record and the public (no `isActive`) view.
- `nepalBank.utils.ts` — `toPublicNepalBank` mapper.
- `nepalBank.integration.test.ts` — colocated integration test.

## Funnel

**User-facing:** the bank shows up as an option in the searchable bank dropdown on the
bank-account form (`bank-accounts`/`brand-bank-accounts` features), nothing more — there's no
screen dedicated to this module on its own.

**Technical:** `nepalBank.routes.ts` → `nepalBank.controller.ts` → `nepalBank.service.ts` →
`nepalBank.repository.ts` → Postgres. The list is seeded from `prisma/seed-data/nepal-banks.json`
(`seedNepalBanks` in `prisma/seed.ts`, upserted by `code` so re-running the seed is safe) and
served from a Redis-cached response (`cache` middleware, `CACHE_TTL.NEPAL_BANKS_PUBLIC`).

## Non-obvious rationale

- No admin CRUD exists for this list yet (toggling `isActive`, editing a bank) — the doc's data
  model supports it but nothing asked for an admin screen, and the seed's upsert-by-`code` already
  covers "add/rename a bank" via a reseed. Add one later if an admin actually needs to hide a bank
  without a deploy.
- No live scheduled refresh job exists either — there's no real NRB API/feed to refresh from
  (the doc mentions "weekly refresh" but names no source). The seed is idempotent, so re-running
  it manually is the refresh mechanism until a real feed is identified.
