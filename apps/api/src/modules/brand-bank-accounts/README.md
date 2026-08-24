# Brand Bank Accounts

## Purpose

The brand-owned mirror of `bank-accounts`: lets a brand register, list, and set a default Nepali
bank account to receive withdrawals against. `Brand` isn't a `User` row in this schema, and
multiple users can hold a `BrandMembership` against the same brand — so this is a sibling table
keyed by `brandId`, not a reuse of the creator-scoped `BankAccount.userId` table.

## Structure

- `brandBankAccount.routes.ts` — `POST /`, `GET /`, `PATCH /:id/default` (any member of the
  caller's brand); `PATCH /:id/verify`, `GET /:id/reveal` (admin-only).
- `brandBankAccount.controller.ts` — resolves the caller's brand via `requireBrandId`
  (`#lib/brand-guard.utils.js`), reads validated input, calls the service.
- `brandBankAccount.service.ts` — same rules as `bank-accounts`' service, checked against the
  brand instead of a user.
- `brandBankAccount.repository.ts` — Prisma queries, including the transactional set-default swap.
- `brandBankAccount.types.ts` — DB-shaped and public (masked) view types.
- `brandBankAccount.utils.ts` — `toPublicBrandBankAccount` mapper.
- `brandBankAccount.integration.test.ts` — colocated integration test.

Shares the create-body Zod schema and the account-number encryption utils with `bank-accounts`
(`#lib/bank-account-body.schemas.js`, `#lib/account-number-encryption.utils.js`,
`#lib/name-mismatch.utils.js`) — the form shape and rules are identical, only the owner differs.

## Funnel

**User-facing:** any team member on a brand (any `BrandMembership` role — same authorization
granularity the brand dashboard already uses for products/orders, not owner-only) can add the
brand's payout bank account from the brand wallet screen. It belongs to the brand, not to
whichever member happened to add it.

**Technical:** `brandBankAccount.routes.ts` → `brandBankAccount.controller.ts` (resolves
`brandId` via `requireBrandId`) → `brandBankAccount.service.ts` →
`brandBankAccount.repository.ts` → Postgres.

## Non-obvious rationale

- Same encryption/audit-log design as `bank-accounts` (see that module's README) — account
  numbers are never stored in plaintext, and the only decrypt path (`GET /:id/reveal`,
  admin-only) writes a `BrandBankAccountAccessLog` row every time.
- The account-holder-name mismatch check compares against `Brand.contactName`, not any
  individual member's name — the account belongs to the brand as an entity.
