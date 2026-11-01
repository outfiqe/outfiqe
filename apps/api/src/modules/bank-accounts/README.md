# Bank Accounts (creator)

## Purpose

Lets an individual user (a creator, in practice — this is scoped by `userId`, not by
`isCreator`/`creatorStatus`, so it works for any authenticated user) register, list, and set a
default Nepali bank account to receive withdrawals against. Account numbers are encrypted at
rest and only ever decrypted through one narrow, audited admin path.

## Structure

- `bank-account.errors.ts` — `bankAccountErrors`, the errors this module raises from more than one place.
- `bank-account.routes.ts` — `POST /`, `GET /`, `PATCH /:id/default` (owner-only); `GET /admin` needs `platform:withdraw:read` or
  `platform:withdraw:manage` (it only shows masked account numbers), while
  `PATCH /:id/verify` and `GET /:id/reveal` need `platform:withdraw:manage` (`requirePlatformRole`,
  see `platform-access/README.md` — reused from the withdraw module, since verifying/revealing a
  bank account is part of the same "clear money out to a real bank" workflow, not a separate
  concern). `GET /admin` is the cursor-paginated queue the admin `bank-accounts` feature reads,
  filterable by `?verified=`.
- `bank-account.controller.ts` — reads validated input + the auth principal, calls the service.
- `bank-account.service.ts` — business rules: validates the bank is active/known
  (`nepalBankService.requireActiveBank`), checks the QR photo against the typed details
  (`bankQrVerificationService.checkQrForNewBankAccount`), encrypts the account number on create,
  flags an account-name/legal-name mismatch without blocking, auto-defaults a user's first
  account, decrypts + audit-logs on reveal.
- `bank-account.repository.ts` — Prisma queries, including the transactional set-default swap.
- `bank-account.types.ts` — DB-shaped and public (masked) view types.
- `bank-account.utils.ts` — `toPublicBankAccount` mapper, `isNameMismatch` check.
- `bank-account.integration.test.ts` — colocated integration test.

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
default. The QR is read on save:

- If it shows the same holder name and account number, the account is verified straight away.
- If the photo has no QR code, or the QR shows a different account, the form shows an error.
- Anything else goes to an admin, who reviews it in the admin `bank-accounts` feature. The QR
  shows straight from the list, along with why it wasn't matched, and revealing the number lets
  them compare it against the submitted fields before verifying it.

The same reveal is also surfaced from the `withdraw-requests` admin screen when actually
processing a payout, so an admin never has to retype account details by hand.

**Technical:** `bank-account.routes.ts` → `bank-account.controller.ts` → `bank-account.service.ts` →
`bank-account.repository.ts` → Postgres. `POST /` first runs the QR check (outside the
transaction, since decoding an image is CPU work), then a transaction that counts the user's
existing accounts and creates the new one with the check result. The new account is marked
`isDefault` only if it's the first.

## Non-obvious rationale

- **Account numbers are never stored in plaintext.** `accountNumberCiphertext` holds an AES-256-GCM
  envelope; `accountNumberLast4` exists purely so list/detail views can render a masked number
  without decrypting anything. The only decryption path is `GET /:id/reveal` (admin-only), and
  every call writes a `BankAccountAccessLog` row (admin id + timestamp) — this is deliberate:
  an admin needs the real number once, to key it into their bank portal for a manual transfer,
  but nothing else in the system should ever see it, and every time something does, it's audited.
- **`qrCodeImageUrl` exists because Nepal has no account-verification API.** No bank exposes a
  penny-drop or name-match service the way India's do. `isNameMismatch` only compares the account
  name with the same user's own profile name, which isn't outside evidence. The QR photo, uploaded
  once at add-time, gives something independent of the typed fields. Rows created before this
  field have `qrCodeImageUrl: null`, and rows created before the QR check have
  `qrCheckStatus: NOT_CHECKED`.
- **A QR match is not proof of ownership.** QR codes have a checksum, not a signature, so a QR can
  be made with any name and number. A match (`verificationMethod: QR_MATCH`, `verifiedById: null`)
  replaces the admin's manual Verify click only. The first payout to every account still needs the
  admin cross-check in `withdraw`. The matching rules and their limits are in
  `bank-qr-verification/README.md`.
- A name mismatch between `accountName` and the user's `name` doesn't block account creation — it
  comes back as a `nameMismatch` flag in the create response, per the design doc's "flag, don't
  block outright" rule. The comparison is case/whitespace-insensitive only; no fuzzy matching.
- The manual `verify` action stamps `verificationMethod: MANUAL`, so admins can tell hand-checked
  accounts from QR-matched ones.
- `verify` and the Rev 3 first-payout cross-check (`firstPayoutCrossCheckedAt`/`By`) are separate
  concerns: `isVerified` is a one-time manual check on the account itself, done here; the
  first-payout cross-check is enforced by the `withdraw` module's `approve` action (it's about
  the first _payout_, not the account, and needs to know about `WithdrawRequest` history this
  module doesn't have).
