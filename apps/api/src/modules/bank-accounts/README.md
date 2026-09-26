# Bank Accounts (creator)

## Purpose

Lets an individual user (a creator, in practice — this is scoped by `userId`, not by
`isCreator`/`creatorStatus`, so it works for any authenticated user) register, list, and set a
default Nepali bank account to receive withdrawals against. Account numbers are encrypted at
rest and only ever decrypted through one narrow, audited admin path.

## Structure

- `bankAccount.routes.ts` — `POST /`, `GET /`, `PATCH /:id/default` (owner-only); `GET /admin` needs `platform:withdraw:read` or
  `platform:withdraw:manage` (it only shows masked account numbers), while
  `PATCH /:id/verify` and `GET /:id/reveal` need `platform:withdraw:manage` (`requirePlatformRole`,
  see `platform-access/README.md` — reused from the withdraw module, since verifying/revealing a
  bank account is part of the same "clear money out to a real bank" workflow, not a separate
  concern). `GET /admin` is the cursor-paginated queue the admin `bank-accounts` feature reads,
  filterable by `?verified=`.
- `bankAccount.controller.ts` — reads validated input + the auth principal, calls the service.
- `bankAccount.service.ts` — business rules: validates the bank is active/known
  (`nepalBankService.requireActiveBank`), encrypts the account number on create, flags an
  account-name/legal-name mismatch without blocking, auto-defaults a user's first account,
  decrypts + audit-logs on reveal.
- `bankAccount.repository.ts` — Prisma queries, including the transactional set-default swap.
- `bankAccount.types.ts` — DB-shaped and public (masked) view types.
- `bankAccount.utils.ts` — `toPublicBankAccount` mapper, `isNameMismatch` check.
- `bankAccount.integration.test.ts` — colocated integration test.

Uses two shared pieces (also used by `brand-bank-accounts`): the
`encryptAccountNumber`/`decryptAccountNumber`/`lastFourDigits` trio
(`#lib/account-number-encryption.utils.js`) and the create-body Zod schema
(`bankAccountBodySchema`/`bankAccountIdParamSchema` in `#lib/bank-account-body.schemas.js`) —
the form shape (bank, account name, account number ×2, branch) is identical for a creator's and a
brand's bank account, so it lives in `shared/utils` rather than being duplicated per module.

## Funnel

**User-facing:** a user adds a bank account from their dashboard (bank picked from a searchable
dropdown backed by `nepal-banks`, account number entered twice to confirm, a photo of the bank's
QR code required alongside), sees it in their list masked as `•••• 1234`, can mark one as
default. An admin reviews it in the admin `bank-accounts` feature — the QR shows straight from
the list, and revealing the number lets them compare it against the submitted fields — before
verifying it; the same reveal is also surfaced from the `withdraw-requests` admin screen when
actually processing a payout, so an admin never has to retype account details by hand.

**Technical:** `bankAccount.routes.ts` → `bankAccount.controller.ts` → `bankAccount.service.ts` →
`bankAccount.repository.ts` → Postgres. `POST /` runs inside a transaction that counts the
user's existing accounts and creates the new one, marking it `isDefault` only if it's the first.

## Non-obvious rationale

- **Account numbers are never stored in plaintext.** `accountNumberCiphertext` holds an AES-256-GCM
  envelope; `accountNumberLast4` exists purely so list/detail views can render a masked number
  without decrypting anything. The only decryption path is `GET /:id/reveal` (admin-only), and
  every call writes a `BankAccountAccessLog` row (admin id + timestamp) — this is deliberate:
  an admin needs the real number once, to key it into their bank portal for a manual transfer,
  but nothing else in the system should ever see it, and every time something does, it's audited.
- **`qrCodeImageUrl` exists because verification has no automated check to lean on.** No bank in
  Nepal exposes a public account-verification API (no penny-drop/name-match service the way
  India's do), so `isVerified` can only ever be a human judgment call. Before this field, an admin
  clicking "verify" had nothing to check beyond the self-reported form fields — `isNameMismatch`
  only compares the account name against the same user's own profile name, not third-party
  evidence. The QR photo, uploaded once at add-time (required going forward; existing rows before
  this field predate it and have `qrCodeImageUrl: null`), gives the admin something independent
  of the typed fields to compare against.
- A name mismatch between `accountName` and the user's `name` doesn't block account creation — it
  comes back as a `nameMismatch` flag in the create response, per the design doc's "flag, don't
  block outright" rule. The comparison is case/whitespace-insensitive only; no fuzzy matching.
- `verify` and the Rev 3 first-payout cross-check (`firstPayoutCrossCheckedAt`/`By`) are separate
  concerns: `isVerified` is a one-time manual check on the account itself, done here; the
  first-payout cross-check is enforced by the `withdraw` module's `approve` action (it's about
  the first _payout_, not the account, and needs to know about `WithdrawRequest` history this
  module doesn't have).
