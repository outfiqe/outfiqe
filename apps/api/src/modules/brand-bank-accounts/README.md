# Brand Bank Accounts

## Purpose

The brand-owned mirror of `bank-accounts`: lets a brand register, list, and set a default Nepali
bank account to receive withdrawals against. `Brand` isn't a `User` row in this schema, and
multiple users can hold a `BrandMembership` against the same brand — so this is a sibling table
keyed by `brandId`, not a reuse of the creator-scoped `BankAccount.userId` table.

## Structure

- `brand-bank-account.routes.ts` — `POST /`, `GET /`, `PATCH /:id/default` (any member of the
  caller's brand); `GET /admin`, `PATCH /:id/verify`, `GET /:id/reveal` (admin-only). `GET /admin`
  is the cursor-paginated queue the admin `bank-accounts` feature reads, filterable by
  `?verified=`.
- `brand-bank-account.controller.ts` — resolves the caller's brand via `requireBrandId`
  (`#lib/brand-guard.utils.js`), reads validated input, calls the service.
- `brand-bank-account.service.ts` — same rules as `bank-accounts`' service, checked against the
  brand instead of a user, including the same QR check through `bank-qr-verification`.
- `brand-bank-account.repository.ts` — Prisma queries, including the transactional set-default swap.
- `brand-bank-account.types.ts` — DB-shaped and public (masked) view types.
- `brand-bank-account.utils.ts` — `toPublicBrandBankAccount` mapper.
- `brand-bank-account.integration.test.ts` — colocated integration test.

Shares the create-body Zod schema and the account-number encryption utils with `bank-accounts`
(`#lib/bank-account-body.schemas.js`, `#lib/account-number-encryption.utils.js`,
`#lib/name-mismatch.utils.js`) — the form shape and rules are identical, only the owner differs.

## Funnel

**User-facing:** any team member on a brand (any `BrandMembership` role — same authorization
granularity the brand dashboard already uses for products/orders, not owner-only) can add the
brand's payout bank account from the brand wallet screen. It belongs to the brand, not to
whichever member happened to add it. The QR photo is read as soon as it's saved: a QR showing
the same holder name and account number verifies the account straight away, a photo with no QR
is refused, and anything else waits for an admin.

**Technical:** `brand-bank-account.routes.ts` → `brand-bank-account.controller.ts` (resolves
`brandId` via `requireBrandId`) → `brand-bank-account.service.ts` (runs
`bankQrVerificationService.checkQrForNewBankAccount` before the create transaction) →
`brand-bank-account.repository.ts` → Postgres.

## Non-obvious rationale

- Same encryption/audit-log design as `bank-accounts` (see that module's README) — account
  numbers are never stored in plaintext, and the only decrypt path (`GET /:id/reveal`,
  admin-only) writes a `BrandBankAccountAccessLog` row every time.
- Same QR check as `bank-accounts` (see `bank-qr-verification/README.md`). A brand's QR is often
  a merchant QR that shows a shop name rather than the legal account name, so those accounts go
  to admin review (`NAME_DIFFERS`) rather than being refused.
- The account-holder-name mismatch check compares against `Brand.contactName`, not any
  individual member's name — the account belongs to the brand as an entity.
