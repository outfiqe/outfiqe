# Bank accounts

## Purpose

The admin review queue for creator and business bank accounts: compare the QR code the owner
uploaded when adding the account against the account number (revealed on demand), and verify the
account so it can receive a withdrawal. See `apps/api/src/modules/bank-accounts/README.md` and
`apps/api/src/modules/brand-bank-accounts/README.md` for why `isVerified` gates withdrawals in
the first place.

## Structure

- `api.ts` — `GET /bank-accounts/admin` or `GET /brand-bank-accounts/admin` (owner-type
  dependent), `PATCH /:id/verify`, `GET /:id/reveal`.
- `schemas.ts` — `OwnerTypeValue`, `AdminBankAccount`, `RevealedBankAccount`, the
  pending/verified filter values.
- `hooks/useInfiniteBankAccounts.ts` — the paginated, owner-type- and filter-scoped queue.
- `BankAccountsListSection.tsx` — the queue: an owner-type tab (Creator/Business), a
  pending/verified tab, and per-row Reveal/Verify actions.
- `BankAccountsPage.tsx` — the route's top-level wrapper.

## Funnel

**Admin-facing:** pick Creator or Business, then Pending or Verified. Each row already shows the
QR code the owner uploaded — no click needed for that. Reveal a row to see the real account
number next to it and compare against what the owner typed in; Verify once they match. A verified
account immediately unblocks that owner's withdrawals — see `apps/api/src/modules/withdraw/README.md`'s
`hasVerifiedBankAccount` gate.

**Technical:** `BankAccountsListSection.tsx` → `api.ts` → `bank-accounts`/`brand-bank-accounts`
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

**There is no automated identity check behind "Verify."** No bank in Nepal exposes a
public account-verification API the way India's penny-drop APIs do, so this is a human judgment
call: the admin compares the revealed account number and the QR code photo against the submitted
form fields (name, number, branch) and decides. The QR upload at add-time
(`apps/web/src/features/bank-accounts`) exists specifically to give this screen something to
check against, since the account-holder-name match alone (`isNameMismatch`) is just a string
comparison against the owner's own profile name, not third-party evidence.

**The same reveal is also surfaced from `withdraw-requests`, not duplicated.** Both screens call
the same `GET /:id/reveal`; `withdraw-requests` uses the `bankAccountId` already resolved onto
its `AdminWithdrawRequestView` (see `apps/api/src/modules/withdraw/README.md`) so an admin
processing a payout doesn't have to leave that screen and look the account up here separately.
