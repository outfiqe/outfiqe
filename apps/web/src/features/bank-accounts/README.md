# Bank Accounts

## Purpose

Add and manage the bank accounts a creator or a brand can withdraw to. One feature, not two —
see rationale below.

## Structure

- `api/bankAccountApi.ts` / `bankAccountSchemas.ts` — `GET/POST /bank-accounts` (creator) or
  `/brand-bank-accounts` (business), `PATCH /:id/default`, and the `AddBankAccountInput` form
  schema (mirrors `apps/api/src/shared/utils/bank-account-body.schemas.ts`).
- `hooks/useBankAccounts.ts` / `useAddBankAccount.ts` / `useSetDefaultBankAccount.ts` — list
  query and the two mutations, all keyed by `["bank-accounts", ownerType]`.
- `components/BankAccountsList.tsx` — the section: list, empty state, "Add bank account" button.
- `components/BankAccountCard.tsx` — one account row: masked number, verification badge, "Set as
  default" action.
- `components/AddBankAccountModal.tsx` — the add form (bank picker from `nepal-banks`, account
  name/number/confirm/branch).

## Funnel

**User-facing:** pick a bank from the dropdown, enter account details, submit. The new account
starts unverified — an admin verifies it before it can receive a withdrawal (see `withdraw`'s
README for why).

**Technical:** `BankAccountsList` → `useBankAccounts(ownerType)` → `bankAccountApi.list` → the
owner-appropriate REST path. Every call in this feature is parameterized by `ownerType`
(`"CREATOR" | "BUSINESS"`), never split into two copies of the same component.

## Non-obvious rationale

**One feature serves both owner types, not a mirrored `brand-bank-accounts` feature.** The
backend keeps `bank-accounts` and `brand-bank-accounts` as separate modules (different
ownership/authorization scoping — see their READMEs), but their request/response shapes are
byte-for-byte identical. Splitting the frontend into two near-duplicate feature folders would
mean maintaining the same form, the same card, and the same list twice. Instead
`bankAccountApi.ts` resolves the REST base path from `ownerType`, the same discriminated-owner
pattern `withdraw`'s own `OwnerContext` already uses on the backend and `withdraw`'s frontend
feature uses here too. `apps/web/src/app/dashboard/withdraw/page.tsx` renders
`<BankAccountsList ownerType="CREATOR" />`; `apps/web/src/app/dashboard/wallet/page.tsx` renders
`<BankAccountsList ownerType="BUSINESS" />`.
