# Bank Accounts

## Purpose

Add and manage the bank accounts a creator or a brand can withdraw to. One feature, not two —
see rationale below.

## Structure

- `api/bankAccountApi.ts` / `bankAccountSchemas.ts` — `GET/POST /bank-accounts` (creator) or
  `/brand-bank-accounts` (business), `PATCH /:id/default`, `POST /bank-qr-verification/preview`,
  and the `AddBankAccountInput` form schema (mirrors
  `apps/api/src/shared/utils/bank-account-body.schemas.ts`).
- `hooks/useBankAccounts.ts` / `useAddBankAccount.ts` / `useSetDefaultBankAccount.ts` — list
  query and the two mutations, all keyed by `["bank-accounts", ownerType]`.
- `hooks/usePreviewBankQr.ts` — reads an uploaded QR so the form can fill in what it shows.
- `components/BankAccountsList.tsx` — the section: list, empty state, "Add bank account" button.
- `components/BankAccountCard.tsx` — one account row: masked number, Verified or Pending
  verification badge, "Set as default" action.
- `components/AddBankAccountModal.tsx` — the add form: QR first, then the bank picker from
  `nepal-banks` and account name/number/confirm/branch.
- `components/BankQrUploadField.tsx` — the QR uploader. It calls the preview right after upload,
  fills in only the fields that are still empty, and shows a note about what it read.
- `constants/bankQrMessages.ts` — the QR notes and the after-submit toasts.
- `utils/bankQrPrefill.utils.ts` — `pickBankQrPrefills` (which empty fields to fill) and
  `describeBankQrPreview` (which note to show).

## Funnel

**User-facing:**

1. Upload a photo or screenshot of the bank QR. The holder name and account number are filled in
   if the QR shows them and the fields are still empty, and a note says what was read, or that no QR code was found.
2. Pick the bank, check or enter the details, and submit.
3. If the server finds the same name and number on the QR, the account is added as **Verified**.
   Otherwise it is added as pending, and an admin verifies it before it can receive a withdrawal
   (see `withdraw`'s README for why). A photo with no QR code is refused with a message in the
   form.

Reading the QR in the form is only a help. The server checks it again on submit, and if the
preview call fails, the form still works.

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
feature uses here too. `apps/web/src/app/(dashboard)/withdraw/page.tsx` renders
`<BankAccountsList ownerType="CREATOR" />`; `apps/web/src/app/(dashboard)/wallet/page.tsx` renders
`<BankAccountsList ownerType="BUSINESS" />`.
