# Nepal Banks

## Purpose

The read-only list of Nepali banks a creator or brand picks from when adding a bank account.
Small enough (54 rows) to fetch whole and hold client-side rather than a search-as-you-type
endpoint like `delivery-zones`' city autocomplete.

## Structure

- `api/nepalBankApi.ts` / `nepalBankSchemas.ts` — `GET /banks` and its response shape.
- `hooks/useNepalBanks.ts` — the list query, cached under `["nepal-banks"]`.

## Funnel

**Technical:** `bank-accounts`' `AddBankAccountModal` calls `useNepalBanks()` and renders the
result as a `<Select>`'s options — no server-side search, no pagination. See
`apps/api/src/modules/nepal-banks/README.md` for the backend side.
