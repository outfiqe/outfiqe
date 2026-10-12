# Bank accounts

## Purpose

The admin review queue for creator and business bank accounts: compare the QR code the owner
uploaded when adding the account against the account number (revealed on demand), and verify the
account so it can receive a withdrawal. See `apps/api/src/modules/bank-accounts/README.md` and
`apps/api/src/modules/brand-bank-accounts/README.md` for why `isVerified` gates withdrawals in
the first place.

## Structure

- `api/bankAccountsApi.ts` — `GET /bank-accounts/admin` or `GET /brand-bank-accounts/admin` (owner-type
  dependent), `PATCH /:id/verify`, `GET /:id/reveal`.
- `api/bankAccountsSchemas.ts` — `OwnerTypeValue`, `AdminBankAccount` (including the QR check
  status, reason and verification method), `RevealedBankAccount`, the pending/verified filter
  values.
- `hooks/useInfiniteBankAccounts.ts` — the paginated, owner-type- and filter-scoped queue.
- `components/BankAccountsListSection.tsx` — the queue: an owner-type tab (Creator/Business), a
  pending/verified tab, and per-row Reveal/Verify actions.
- `constants/bankQrCheckLabels.ts` / `utils/bankQrCheck.utils.ts` — the badge label ("Verified by
  QR", "Verified", "Pending verification") and the note that says why a pending account's QR
  wasn't matched.
- `components/BankAccountsPage.tsx` — the route's top-level wrapper.

## Funnel

**Admin-facing:** pick Creator or Business, then Pending or Verified.

- Accounts whose QR showed the same holder name and account number are already verified, and
  show as "Verified by QR".
- Each pending row shows the QR code the owner uploaded (no click needed) and a short note on why
  the automatic check didn't match it, for example "the name on the QR differs from the account
  name".
- Reveal a row to see the real account number next to it and compare it against what the owner
  typed in. Verify once they match. A verified
  account immediately unblocks that owner's withdrawals — see `apps/api/src/modules/withdraw/README.md`'s
  `hasVerifiedBankAccount` gate.

**Technical:** `components/BankAccountsListSection.tsx` → `api/bankAccountsApi.ts` → `bank-accounts`/`brand-bank-accounts`
routes → their services/repositories → Postgres.

## Non-obvious rationale

**The QR code is shown straight from the list; only the account number goes through the audited
reveal path.** The QR photo is a plain URL — nothing about it needs decrypting or an access log,
so `GET /admin` returns it directly. `GET /:id/reveal` exists only for
`accountNumberCiphertext`, and every call to it writes a `BankAccountAccessLog`/
`BrandBankAccountAccessLog` row. This screen calls reveal only on an explicit click and keeps the
decrypted number in local component state (`revealedById`), not in React Query's cache — a
background refetch or another admin's action should never silently re-trigger a decrypt-and-log
the admin didn't ask for.

**There is no outside identity check behind "Verify."** No bank in Nepal exposes a public
account-verification API the way India's penny-drop APIs do.

- The server reads the uploaded QR and verifies only exact matches
  (`apps/api/src/modules/bank-qr-verification/README.md`). Everything else is left to a human
  call: the admin compares the revealed account number and the QR photo against the submitted
  fields (name, number, branch) and decides.
- "Verified by QR" means the QR and the typed details agree. It is not proof of ownership, because
  a QR can be made with any details. That is why the first payout to every account still needs an
  admin cross-check in `withdraw-requests`.

**The same reveal is also surfaced from `withdraw-requests`, not duplicated.** Both screens call
the same `GET /:id/reveal`; `withdraw-requests` uses the `bankAccountId` already resolved onto
its `AdminWithdrawRequestView` (see `apps/api/src/modules/withdraw/README.md`) so an admin
processing a payout doesn't have to leave that screen and look the account up here separately.
