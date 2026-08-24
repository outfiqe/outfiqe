# Withdraw

## Purpose

Policy-gated withdrawal requests against a creator's or a brand's ("business") settlement-ledger
balance. The policy (min/max amount, request window, attempts, cooldown) is admin-editable data,
never hardcoded, and is versioned per `ownerType` — a business withdraws far larger, far less
frequent sums than a creator, so they're governed by separate policy rows, not one shared record.

## Structure

- `withdraw.routes.ts` — user-facing: `GET /policy`, `GET /eligibility`, `POST /requests`,
  `GET /requests` (all `?ownerType=CREATOR|BUSINESS` for the GETs, `ownerType` in the body for the
  POST). Admin: `GET /admin/requests` (`?status=`), `PATCH /admin/requests/:id/approve|reject|
mark-paid`, `PUT /admin/policy` (versioned — creates a new active row for the given `ownerType`,
  deactivating the previous one for that `ownerType` only).
- `withdraw.controller.ts` — reads validated input + the auth principal, calls the service.
- `withdraw.service.ts` — the eligibility formula, the request-creation transaction, cooldown/
  window/attempt checks, admin approve/reject/mark-paid, policy versioning.
- `withdraw.repository.ts` — Prisma queries scoped by `OwnerContext` (`creatorId` or `brandId`,
  never both) for the user-facing side; unscoped admin queries/transitions for the review queue.
- `withdraw.window.utils.ts` — pure window-math for `MONTHLY`/`WEEKLY`/`CUSTOM_DAYS`, no I/O.
- `withdraw.schemas.ts` — Zod validation.
- `withdraw.types.ts` — `OwnerContext` (the discriminated union every service/repository function
  threads through) and view types.
- `withdraw.utils.ts` — view mappers.

## Funnel

**User-facing:** a creator or brand sees a read-only policy panel (min/max, cycle, processing
time) and their current balance, submits a withdrawal request against a verified bank account,
and sees it move through their request history with a status badge. Admin review/settlement is
`withdraw-requests` (admin console, later chunk).

**Technical:** `withdraw.routes.ts` → `withdraw.controller.ts` → `withdraw.service.ts` →
`withdraw.repository.ts` (+ read-only calls into `commissions`/`brand-payouts` for the ledger sum,
`bank-accounts`/`brand-bank-accounts` for verification) → Postgres.

## Non-obvious rationale

- **Balance is computed live, never stored**: `available = SUM(ledger rows WHERE status=AVAILABLE
for this owner) − SUM(amount of this owner's own requests WHERE status IN (PENDING,
UNDER_REVIEW, APPROVED))`. A `PAID` request doesn't need subtracting separately — its claimed
  ledger rows are no longer `AVAILABLE` by the time it's `PAID` (see the admin-review chunk), so
  they fall out of the `AVAILABLE` sum on their own. This is a **hard rule**, not a policy knob:
  balance is only ever what's `AVAILABLE`, regardless of what a policy's min/max says.
- **The ledger-balance read and the withdraw-request-creation transaction are deliberately split.**
  `getAvailableLedgerBalance` (reading `CreatorCommission`/`BrandPayout`) runs _outside_ the
  `Serializable` transaction; only the withdraw-request-specific reads (active policy, attempts
  count, cooldown, reserved-amount) and the insert run _inside_ it. The race this transaction
  actually guards against — two concurrent requests from the same owner both thinking they have
  room for the same money — only involves the `withdraw_requests` table (via `sumReservedAmount`),
  which both the read and the write touch inside the same transaction; Postgres's serializable
  conflict detection catches that overlap and aborts one side with a `P2034`, translated to a
  clean `409` (`isTransactionConflictError`, `#lib/prisma.utils.js`). Reading the ledger tables
  outside the transaction doesn't weaken that guarantee — they aren't part of the invariant being
  protected, and the hard guarantee against double-_paying_ lives later, at mark-paid time
  (claiming specific ledger rows — see the admin-review chunk), not here.
- **A business request above `maxAmount` isn't rejected — it's a soft ceiling.** It's still created,
  but goes straight to `UNDER_REVIEW` with `requiresSecondSignOff: true` instead of `PENDING`,
  requiring a second, different admin's approval before `APPROVED`. A creator's `maxAmount` has no
  such softness — it's a hard reject at creation time.
- **Admin `approve` on a `requiresSecondSignOff` request is two separate calls, and the identity
  cross-check gate (below) applies to whichever call actually flips the status to `APPROVED`, not
  necessarily the first one.** The first admin's call only stamps `firstApprovedById`/`At` and
  leaves the request `UNDER_REVIEW` — that's not yet a real approval, so it doesn't need
  `identityCrossCheckConfirmed`. The second (different) admin's call is the one that moves it to
  `APPROVED`, so _that_ call needs the cross-check confirmation if the account hasn't been
  cross-checked before. Same-admin-twice is rejected (`SAME_ADMIN_SIGN_OFF`, `409`) before either
  check runs.
- **`bankAccountId` in the request body means a different table depending on `ownerType`** —
  `BankAccount` for `CREATOR`, `BrandBankAccount` for `BUSINESS`. `WithdrawRequest` stores this as
  two nullable FKs (`bankAccountId`/`brandBankAccountId`), matching the same "separate explicit
  FKs, not a polymorphic column" pattern `BrandBankAccount` itself follows.
- **`mark-paid` is where the hard ledger claim happens** — one transaction selects the owner's
  `AVAILABLE` `CreatorCommission`/`BrandPayout` rows oldest-first, accumulates until the running
  total is `>= amount`, atomically flips them (`CreatorCommission` reuses its existing `PAID`
  terminal state via `commissionRepository.claimAvailableForCreator`; `BrandPayout` gets a new
  `AVAILABLE → WITHDRAWN` via `brandPayoutRepository.claimAvailableForBrand`), and records one
  `WithdrawRequestLedgerEntry` per claimed row. A partial unique index on each of
  `creatorCommissionId`/`brandPayoutId` (Postgres treats NULLs as distinct, so this only
  constrains the non-null side) makes double-claiming a row impossible at the DB level even if the
  `WHERE status = AVAILABLE` guard somehow raced. If the claim can't find enough rows, the whole
  transaction aborts with `INSUFFICIENT_LEDGER_ROWS` (`409`) and the request stays `APPROVED` —
  no silent partial payout; an admin has to reject or adjust.
- **`WithdrawRequest.paidById` exists separately from `reviewedById`** — `reviewedById` is stamped
  by whichever admin action moved the request to `APPROVED` or `REJECTED`; `paidById` is stamped
  by whichever admin executed `mark-paid`. Two different actions, two different actors to audit,
  per the "every action tied to the acting admin" hard rule.
- **`CUSTOM_DAYS` windows are a recurring cadence anchored to the policy's `createdAt`** — open for
  one day every `windowValue` days (the business policy's "every 14 days"), not "N days before
  some period end" like `MONTHLY`/`WEEKLY`. This is a genuinely underspecified corner of the
  design doc; documented here so it's easy to revisit if the real intent differs.
- **Status-change notifications go through the domain-event bus, not a direct
  `notificationService` call.** On a final approval, a rejection, and a mark-paid, this module
  publishes `DomainEvents.WITHDRAW_REQUEST_STATUS_CHANGED` (`#events/event-bus.js`) and returns —
  it never imports `notifications` directly. `notification.events.ts` is the sole subscriber,
  mapping the request's terminal status to a `NotificationType`
  (`WITHDRAW_REQUEST_APPROVED`/`REJECTED`/`PAID`) and writing the notification. This matches every
  other module in this codebase (`orders`, `brand-applications`, `product-reviews`, ...) — see
  `notifications/README.md`'s Funnel section — and keeps this module from taking on a dependency
  on the `notifications` module's internals. The request-submission email
  (`withdrawRequestReceivedInternalTemplate`) is unaffected by this and stays a direct
  `sendEmail` call, matching `brandApplicationService.submit`'s same split between "email is sent
  synchronously" and "in-app notification is a domain-event side effect."
