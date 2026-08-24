# Outfiqe Bank Information & Withdraw System — PRD

Internal reference doc, committed to the repo. Companion to `PRD-BRAND-PAYOUTS.md` —
that doc defines the **settlement ledger** (`BrandPayout`, `PlatformCommissionRule`,
`CreatorCommission`) that computes what a creator or business is owed and when. This
doc defines the other half: how they actually **get** that money — registering a
verified Nepali bank account, requesting a withdrawal against their ledger balance, and
the admin console that reviews and manually settles those requests.

Originated from a separate draft ("Bank & Withdraw System") written before
`PRD-BRAND-PAYOUTS.md` existed; merged here as the single source of truth for
withdrawal mechanics so the two documents don't describe two different payout models.
Rev 3 — locks a real production withdrawal policy in place of the original's
illustrative placeholder numbers.

Draft status — not yet built. No branch/commits exist for this yet.

---

## 1. Relationship to `PRD-BRAND-PAYOUTS.md`

`PRD-BRAND-PAYOUTS.md` §6.4 originally described admin _proactively_ batching every
brand's available balance on a fixed cycle (a push model). This doc supersedes that —
the actual mechanism is a **pull model**: the creator or business requests a
withdrawal themselves, gated by policy, and admin reviews/settles that specific
request. `PRD-BRAND-PAYOUTS.md` has been updated to point here rather than maintain a
competing design; see its §6.4/§8 for the cross-reference.

## 2. Bank Information Module

Users (creators) and businesses (brands) must register a verified bank account before
they're allowed to request a withdrawal. The bank list itself is not user-entered — it
is pulled once from a canonical Nepal bank dataset (NRB-published list of commercial
banks, development banks, and finance companies) and cached locally, so the frontend
always renders a fast, local dropdown.

### 2.1 Data model

| Table              | Field                                                                                           | Notes                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `NepalBank`        | `id, name, code, logoUrl, type, isActive`                                                       | Seeded from the bank JSON; refreshed on a schedule, not on every request.                    |
| `BankAccount`      | `id, userId, bankId, accountName, accountNumber, branchName, isDefault, isVerified, createdAt`  | Creator-owned. One user can hold multiple accounts; one marked `isDefault`.                  |
| `BrandBankAccount` | `id, brandId, bankId, accountName, accountNumber, branchName, isDefault, isVerified, createdAt` | Business-owned — see §2.4. Same shape as `BankAccount`, scoped to `Brand` instead of `User`. |

### 2.2 Where the bank JSON comes from

- Treat the Nepal bank list as reference data, not user data — import once, cache locally.
- Run the import as a one-off seed plus a scheduled refresh job (e.g. weekly); banks rarely change, no need to fetch on every page load.
- Store an `isActive` flag per bank so a bank can be hidden from new selections without deleting historical records tied to it.

### 2.3 Example API — illustrative only

```
GET   /api/banks                        # list active Nepal banks (cached)
POST  /api/bank-accounts                # add a bank account for the current user
      body: { bankId, accountName, accountNumber, branchName }
GET   /api/bank-accounts                # list current user's saved accounts
PATCH /api/bank-accounts/:id/default    # set as default payout account
```

### 2.4 Form & verification rules

- Bank (searchable dropdown), account holder name, account number, confirm account number, branch.
- Account holder name checked against the user's/brand's KYC/legal name where available; flag a mismatch rather than blocking outright.
- New or edited accounts start `isVerified: false`; admin flips this after a manual check — a request cannot be paid out against an unverified account.

### 2.5 Extending this to brands, not just creators

The original draft scoped `BankAccount` to `userId`. That's correct for a creator (a
creator _is_ a `User` row) but not for a brand: `Brand` is its own entity in Outfiqe's
schema, and multiple users can hold a `BrandMembership` against the same brand. A
brand's payout account belongs to the **brand**, not to whichever team member added it.

Fix: a sibling `BrandBankAccount` table (§2.1), not a polymorphic owner column —
matches how this codebase already handles a similar one-thing-or-another relationship
elsewhere (separate explicit nullable FKs, e.g. `OrderItem.attributedCreatorLookId` /
`attributedLinkId`, rather than a generic polymorphic type+id pair). Any approved
`BrandMembership` user can add/edit it; verification and withdraw-eligibility are
checked against the brand, not the individual member.

## 3. Withdraw Module

Policy-gated, not free-form — similar to how the Facebook Professional Dashboard
restricts creator payouts to a defined cycle with limits. The policy is data an admin
edits, never hardcoded, so limits can change without a deploy.

### 3.1 Policy data model

| Field                        | Type           | Purpose                                                                                                                                                      |
| ---------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ownerType`                  | enum           | `CREATOR` / `BUSINESS` — a business withdraws far larger, far less frequent sums than a creator; one shared policy can't represent both honestly. See §3.1a. |
| `minAmount` / `maxAmount`    | decimal        | Floor and ceiling per withdrawal request.                                                                                                                    |
| `windowType`                 | enum           | `MONTHLY` / `WEEKLY` / `CUSTOM_DAYS` — when withdrawals open.                                                                                                |
| `windowValue`                | int            | e.g. "5" = window opens 5 days before month end.                                                                                                             |
| `maxAttemptsPerWindow`       | int            | Max withdrawal requests per window.                                                                                                                          |
| `cooldownAfterRejectionDays` | int            | Delay before re-request after a rejection.                                                                                                                   |
| `processingNoteText`         | text           | Human-readable text shown to users (e.g. settlement time).                                                                                                   |
| `isActive`                   | boolean        | Only one policy version active _per `ownerType`_ at a time.                                                                                                  |
| `updatedBy` / `updatedAt`    | ref / datetime | Admin audit trail for policy changes.                                                                                                                        |

### 3.1a Production policy — locked defaults

| Field                    | Creator                                 | Business                                 |
| ------------------------ | --------------------------------------- | ---------------------------------------- |
| Minimum per request      | NPR 500                                 | NPR 3,000                                |
| Maximum per request      | NPR 100,000                             | NPR 500,000 _(soft ceiling — see below)_ |
| Window                   | Monthly — opens 5 days before month end | Bi-weekly — every 14 days                |
| Requests per window      | 1                                       | 1                                        |
| Cooldown after rejection | 7 days                                  | 5 days                                   |
| Stated processing SLA    | 5–7 business days after approval        | 3–5 business days after approval         |

**"Soft ceiling," precisely:** a business request above NPR 500,000 isn't rejected —
it's auto-routed to `UNDER_REVIEW` (§3.2) instead of the normal approve queue,
requiring a second admin sign-off before `APPROVED`. Standard pattern for "don't
hard-block legitimate large revenue, but don't let one click move a huge sum
unreviewed."

**Hard rules — not admin-editable, apply regardless of policy:**

- No request against an unverified bank account (§2.4), regardless of balance or window state.
- First-ever payout on any account gets mandatory manual identity/bank-name cross-check, even if the account was already marked `isVerified` from a prior check — highest fraud/mistake risk sits on the first transfer to a new destination.
- Withdrawable balance is only ever what's `AVAILABLE` in the settlement ledger (`PRD-BRAND-PAYOUTS.md` §5.3 / `CreatorCommission.status`) — never `PENDING`, no matter what the policy's min/max says.
- Every rejection carries a stated reason, shown to the requester.
- Every policy edit and every approve/reject/mark-paid action is audited — acting admin id + timestamp.
- No withdrawal-processing fee in v1 — explicit call. Outfiqe's margin comes from the platform take-rate already deducted before money reaches the ledger; charging again to withdraw one's own balance is worth avoiding unless there's a specific later reason.

### 3.2 Withdraw request lifecycle

```
PENDING → UNDER_REVIEW (optional) → APPROVED → PAID
PENDING → REJECTED (reason required; cooldown applies before re-request)
```

- **PENDING** — user submits a request against a verified bank account; system checks it against the active policy (amount bounds, window open, attempts remaining).
- **UNDER_REVIEW** — admin double-checks before acting (mandatory for a business request above the soft ceiling, §3.1a).
- **APPROVED** — admin confirms the request is valid; queued for manual payment.
- **PAID** — admin manually transfers funds and marks the request paid, attaching a reference note. This is also the moment the underlying ledger rows the request drew against are reserved and flipped terminal — see §3.5.
- **REJECTED** — admin rejects with a reason; cooldown (if configured) applies before re-request.

### 3.3 Example withdraw-request API — illustrative only

```
GET  /api/withdraw/policy       # current active policy for this ownerType
GET  /api/withdraw/eligibility  # window open? attempts left? min/max?
POST /api/withdraw/requests     # create a withdrawal request
     body: { bankAccountId, amount }
GET  /api/withdraw/requests     # current user's request history + status
```

Example policy payload — creator:

```json
{
  "ownerType": "CREATOR",
  "minAmount": 500,
  "maxAmount": 100000,
  "windowType": "MONTHLY",
  "windowValue": 5,
  "maxAttemptsPerWindow": 1,
  "cooldownAfterRejectionDays": 7,
  "processingNoteText": "Processed manually, 5-7 business days after approval.",
  "nextWindowOpensAt": "2026-09-25T00:00:00Z"
}
```

Example policy payload — business:

```json
{
  "ownerType": "BUSINESS",
  "minAmount": 3000,
  "maxAmount": 500000,
  "windowType": "CUSTOM_DAYS",
  "windowValue": 14,
  "maxAttemptsPerWindow": 1,
  "cooldownAfterRejectionDays": 5,
  "processingNoteText": "Processed manually, 3-5 business days after approval.",
  "nextWindowOpensAt": "2026-09-07T00:00:00Z"
}
```

### 3.4 What the user/business sees

- A persistent, read-only Withdraw Policy panel (min/max amount, cycle, attempts left, processing time) — sourced live from the policy record for their `ownerType`.
- **Current balance**, an amount input constrained to policy bounds, and the selected bank/brand-bank account.
- Request history with status badges and rejection reasons.

### 3.5 Where "Current balance" actually comes from

The one number the original draft named but never defined a source for — and it's
load-bearing, since the whole flow is gated on it. Not a stored counter incremented by
hand; computed live from the settlement ledger (`PRD-BRAND-PAYOUTS.md` §5):

- **Creator**: `SUM(CreatorCommission.amount) WHERE creatorId = :id AND status = 'AVAILABLE'` — already exists in Outfiqe today.
- **Business**: `SUM(BrandPayout.netAmount) WHERE brandId = :id AND status = 'AVAILABLE'` — new, `PRD-BRAND-PAYOUTS.md` §5.

The other half this closes: when a `WithdrawRequest` moves to `PAID`, the specific
ledger rows it drew against must be reserved and flipped to a terminal `WITHDRAWN`
state in the **same transaction** — otherwise the same available balance could be
claimed by two overlapping requests, or the same sale could fund two payouts. New join
table `WithdrawRequestLedgerEntry{withdrawRequestId, ledgerEntryType, ledgerEntryId}`
snapshots exactly which `CreatorCommission`/`BrandPayout` rows a request was paid
against, claimed via the same atomic conditional-`updateMany` pattern used everywhere
else in this codebase for a scarce resource (stock, idempotency keys) — not a
read-then-write balance check.

`BrandPayout.status`/`CreatorCommission.status` gain a `WITHDRAWN` terminal state
alongside `PAID` (or `PAID` is redefined to mean exactly this — naming to be finalized
against `PRD-BRAND-PAYOUTS.md` during implementation, not duplicated as two separate
concepts).

## 4. Admin Console

Two responsibilities: reviewing and manually settling withdraw requests, and editing
the policy that governs them. Both audited — every change and every payout action tied
to the acting admin.

### 4.1 Manual review & payout workflow

- Queue view of all `PENDING` / `UNDER_REVIEW` requests with user/brand, amount, and bank account details.
- Admin verifies the bank account (if not already verified) and approves or rejects.
- On approval, admin performs the actual bank transfer **outside the system**, then returns to mark the request `PAID` with a reference note/transaction ID for audit — this is also where §3.5's ledger-row reservation happens.
- Rejections require a reason, shown back to the requester; cooldown rules apply automatically.

### 4.2 Policy management

- Admin can edit min/max amount, window type/value, attempt limits, and cooldown — changes create a new policy version rather than mutating history, so past requests still reference the policy that applied when they were made.
- Only one policy is `isActive` per `ownerType` at a time; activating a new version deactivates the previous one for that type.

### 4.3 Example admin API — illustrative only

```
GET   /api/admin/withdraw/requests?status=PENDING&ownerType=BUSINESS
PATCH /api/admin/withdraw/requests/:id/approve
PATCH /api/admin/withdraw/requests/:id/reject     body: { reason }
PATCH /api/admin/withdraw/requests/:id/mark-paid  body: { referenceNote }
PUT   /api/admin/withdraw/policy                  body: { ownerType, ...policy fields }
```

### 4.4 Platform financial rollup

Same rollup already specified in `PRD-BRAND-PAYOUTS.md` §6.5 — this doc adds no new
aggregation, just confirms `WithdrawRequest{status: PAID}` (not a batch construct) is
what "platform revenue realized" and "paid out" figures should sum against once this
supersedes §6.4's original batch design.

## 5. Suggested build order

1. Seed `NepalBank`; build the creator bank-account form/list (§2.1–2.4).
2. Add `BrandBankAccount` and the brand-side bank-details UI (§2.5).
3. Build the settlement ledger this depends on — see `PRD-BRAND-PAYOUTS.md` §12 steps 1–3 (schema, checkout snapshot, lifecycle sweep) — must land before step 4 below has a real balance to check against.
4. Model `WithdrawPolicy` (with `ownerType`); seed the two locked default rows from §3.1a; build the read-only policy panel (§3.1, §3.4).
5. Build withdraw-request creation with eligibility checks, sourced from the real ledger sum (§3.2–3.3, §3.5).
6. Build the admin review queue (approve/reject/mark-paid), including the ledger-row reservation on mark-paid (§4.1, §3.5).
7. Build the admin policy editor with versioning (§4.2).
8. Build the platform financial rollup dashboard (§4.4 / `PRD-BRAND-PAYOUTS.md` §6.5).
9. Add notifications (email/in-app) for status changes on both requester and admin sides.

**How to apply:** read this doc alongside `PRD-BRAND-PAYOUTS.md` before touching either
— they're two halves of one system (ledger vs. withdrawal mechanics), and building one
without the other leaves either a balance with no way to withdraw it, or a withdraw
flow with no real balance to check.
