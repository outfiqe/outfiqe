# Withdraw

## Purpose

Lets a creator or a brand request a withdrawal of their available settlement-ledger balance to a
verified bank account, see the policy they're withdrawing under, and track past requests through
to admin approval, rejection, or payment. See `apps/api/src/modules/withdraw/README.md` for the
balance formula and admin-review rules this UI reflects.

## Structure

- `api/withdrawApi.ts` / `withdrawSchemas.ts` — `GET /withdraw/policy`, `GET /withdraw/eligibility`,
  `POST /withdraw/requests`, `GET /withdraw/requests` (all `?ownerType=CREATOR|BUSINESS`).
- `hooks/useWithdrawPolicy.ts` / `useWithdrawEligibility.ts` — the policy and live-eligibility
  reads (min/max, window, attempts, cooldown, available balance).
- `hooks/useCreateWithdrawRequest.ts` — the submit mutation; invalidates eligibility and history
  on success.
- `hooks/useMyWithdrawRequests.ts` — the paginated request history.
- `components/WithdrawSection.tsx` — the page: policy/balance panel, bank accounts (reused from
  `bank-accounts`), the request form, and history.
- `components/WithdrawPolicyPanel.tsx` — available balance + limits + window/cooldown status.
- `components/WithdrawRequestForm.tsx` — amount + bank account, gated behind whichever
  ineligibility reason currently applies (no verified account, window closed, cooldown, attempts
  exhausted) rather than a raw disabled button with no explanation.
- `components/WithdrawRequestRow.tsx` / `WithdrawRequestStatusBadge.tsx` — one history entry.

## Funnel

**User-facing:** see current balance and limits, add/verify a bank account if needed, submit a
withdrawal, watch it move from pending through the admin's review to paid (or see why it was
rejected).

**Technical:** `WithdrawSection` (parameterized by `ownerType`) → the four hooks above →
`withdrawApi` → the matching REST path. `apps/web/src/app/dashboard/withdraw/page.tsx` renders it
with `ownerType="CREATOR"`; `apps/web/src/app/dashboard/wallet/page.tsx` renders it with
`ownerType="BUSINESS"` — one component tree, not two, per the same reasoning as `bank-accounts`'
README.

## Non-obvious rationale

**The request form doesn't just disable its submit button when ineligible — it replaces itself
with the specific reason (`FormBanner`).** A disabled button with no explanation fails this
codebase's resilience bar (see the root `CLAUDE.md`'s "every read from an external dependency
needs a considered failure path" and empty-state conventions) — a creator with no verified bank
account and a creator in a post-rejection cooldown are different situations that need different
next actions, not the same greyed-out control.
