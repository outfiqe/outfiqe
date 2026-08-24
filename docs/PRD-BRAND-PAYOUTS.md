# Outfiqe Brand Payments & Settlement — PRD

Internal reference doc, committed to the repo. Companion to `PRD-COMMERCE.md` — that
doc explicitly scoped **out** "modeling Outfiqe's own platform fee/take-rate against
commission economics" (§2.2) and shipped brand dashboard order **visibility only**
(§5.15/chunk 16, no financial actions). This PRD covers the piece that was
deliberately deferred: how money actually gets from a buyer's eSewa/Khalti/COD payment
to a brand's bank account, and everything a production marketplace needs around that —
not just a ledger table.

Draft status — this is a spec to review and lock decisions against (see §8), not yet
built. No branch/commits exist for this yet.

**Companion doc: `PRD-BANK-WITHDRAW.md`.** This PRD owns the _ledger_ — computing what
a brand is owed and when it becomes available. It does **not** own how a brand actually
gets that money out; that mechanism (bank account registration, policy-gated withdraw
requests, admin review/settlement) lives entirely in `PRD-BANK-WITHDRAW.md`. §6.4 below
originally sketched admin-driven batch settlement before that companion doc existed —
it's since been superseded by the pull/withdraw-request model there; read §6.4's
current text, not the git history, for what's actually current.

---

## 1. Goal

Every order today ends with money sitting in Outfiqe's own eSewa/Khalti merchant
account or as COD cash collected by delivery, and a brand only ever _sees_ that a sale
happened — nothing computes what they're owed, nothing tracks it through delivery and
the return window, and nothing gets them paid. This PRD turns that into a real
settlement system: an accurate per-brand ledger from the moment of sale through payout,
a brand-facing Payments dashboard they can trust, and an admin-facing Payments Ops
console to run settlement cycles safely — built to the same correctness/security bar as
the rest of commerce (see root `CLAUDE.md` "Product Context"), not a lighter-weight
follow-up.

## 2. Current state — audit

What exists today, and exactly what's missing, verified against the live schema and
code (not assumed from the plan):

| Area                | Exists today                                                                                                                          | Missing                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Brand entity        | `Brand{id, name, contactName, email, phone, instagram, ...}` — no financial fields                                                    | Bank account details, payout eligibility/KYC status                                              |
| Platform commission | Not modeled anywhere — `CreatorCommission.amount` comes purely from `CommissionTier`, nothing analogous exists for what Outfiqe keeps | A take-rate model (flat %, tiered, or per-brand)                                                 |
| Order → brand money | `OrderItem.unitPrice/qty` + `Product.brandId` join — the raw data needed is there                                                     | No `BrandPayout`/ledger row is ever created; no lifecycle                                        |
| Brand dashboard     | `/dashboard/orders` — read-only, item-level-paginated, PII-stripped (chunk 16)                                                        | A Payments tab: balance, ledger, payout history, bank details form                               |
| Admin               | Full order fulfilment/cancel/refund (chunk 15), commission tier + payout admin (chunk 12)                                             | Nothing analogous for brand payables — no settlement-cycle screen, no cross-brand financial view |
| Refund/cancel       | `orders.cancel` restores stock and voids the item's `CreatorCommission` atomically (`commissionRepository.voidForOrder`)              | Nothing voids/claws back a brand payable the same way                                            |
| Reporting           | `getSalesStatsByProductIds`/`withSalesStats` — units/revenue _stats_ only                                                             | No "what does this add up to as money owed" view anywhere                                        |

Net: the commerce and creator-commission systems are production-grade; the brand
settlement half of the marketplace does not exist yet.

## 3. Scope

### 3.1 In scope

- Brand bank/payout-account details, collected and verified before first payout.
- A platform take-rate model applied per order item at order-creation time (mirrors how
  `CreatorCommission.amount` snapshots a `CommissionTier` value).
- `BrandPayout` ledger: one row per order item, same `PENDING → AVAILABLE → PAID /
VOIDED` lifecycle as `CreatorCommission`, reusing the existing lifecycle-sweep
  infrastructure (`shared/scheduling`).
- Refund/cancel voiding a brand payable, symmetric with the existing commission-voiding
  path.
- Brand-facing **Payments** tab: balance summary (pending/available/paid), a per-order
  ledger, bank details management.
- Admin-facing **Payments Ops** console: reviewing and settling brand withdraw
  requests (mechanism defined in `PRD-BANK-WITHDRAW.md`, not duplicated here), plus a
  platform-wide financial rollup (gross collected, refunded, brand payable, creator
  payable, platform revenue) — the thing that answers "how much money is actually
  where, right now."
- Manual transfer execution (admin does the real bank transfer outside the app, then
  marks the withdraw request paid) — matches the pattern already accepted for creator
  payouts and standard practice at this stage (see §11).

### 3.2 Explicitly out of scope (v1)

- Automated bank disbursement (a real bulk-transfer bank API). Revisit once manual
  per-cycle transfer volume genuinely becomes an ops bottleneck — this is an execution
  swap, not a ledger redesign, same seam already proven by the reconciliation-sweep
  worker-swap design.
- Gateway-level split/marketplace payments (eSewa/Khalti sub-merchant accounts per
  brand). Heavier KYC per brand than is justified yet; the hold-then-settle model is
  standard for platforms at this stage.
- Partial refunds (still out of scope per `PRD-COMMERCE.md` §2.2 — this PRD inherits
  that limitation; a brand payable follows the same full-order-refund assumption).
- Per-brand negotiated take-rates in the admin UI (start with one global rate; the data
  model should not preclude per-brand override later, but building that UI now is not
  in scope).
- Automated invoice/tax-document generation. Flagged as a real production gap (see §10)
  but a distinct piece of scope from settlement itself.
- Downloadable payout statements/CSV export for brands. Same — real gap, separate scope.

## 4. Actors (extends `PRD-COMMERCE.md` §4)

| Actor               | New surface                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------- |
| Brand owner         | `apps/web` `/dashboard/payments` — balance, ledger, bank details                         |
| Admin (ops/finance) | `apps/admin` `/payments` — settlement cycles, financial rollup, per-brand payout actions |

## 5. Data model (new)

```
Brand
  + payoutBankName        String?
  + payoutAccountName     String?
  + payoutAccountNumber   String?   // encrypted at rest, see §9
  + payoutVerifiedAt      DateTime?
  + payoutStatus          BrandPayoutEligibility  @default(UNVERIFIED)  // UNVERIFIED | VERIFIED | SUSPENDED

PlatformCommissionRule            // deliberately named distinctly from CreatorCommission's CommissionTier
  id          uuid
  ratePercent Int                 // basis points would over-engineer v1; whole-percent int is enough
  isActive    Boolean @default(true)
  createdAt / updatedAt
  // v1: exactly one active global row, enforced in service layer (not a DB constraint —
  // mirrors how CommissionTier has no such constraint either, admin UI enforces it)

BrandPayout
  id            uuid
  brandId       uuid  -> Brand
  orderItemId   uuid  @unique -> OrderItem     // 1:1, same shape as CreatorCommission
  grossAmount   Int    // unitPrice * qty, snapshotted
  platformFee   Int    // snapshotted from PlatformCommissionRule at order time
  gatewayFee    Int    // snapshotted estimate at order time (0 for COD — see §8 open Q)
  netAmount     Int    // grossAmount - platformFee - gatewayFee
  status        BrandPayoutStatus @default(PENDING)  // PENDING | AVAILABLE | WITHDRAWN | VOIDED
  approvedAt    DateTime?
  availableAt   DateTime?
  withdrawnAt   DateTime?
  voidedReason  String?
  createdAt
```

`WITHDRAWN` is the terminal "paid" state — reached only via a `WithdrawRequest`
(defined in `PRD-BANK-WITHDRAW.md` §3) moving to `PAID`, which atomically claims and
flips this row through a `WithdrawRequestLedgerEntry` join record (that doc's §3.5).
There is no `BrandPayout`-level "batch" concept in this design — settlement is
requester-initiated (pull), not admin-cycle-initiated (push); see the note at the top
of this document.

Follows the exact snapshot-at-creation-time principle already established for
`CreatorCommission.amount` (a later rate change never retroactively touches an existing
payable) and the exact atomic-conditional-update pattern used everywhere else in this
codebase for every status transition (`updateMany({ where: { status: FROM } })`, no
optimistic-lock races).

## 6. Complete flows

### 6.1 Brand bank details — onboarding/settings

1. A brand owner adds payout bank details from `/dashboard/payments` (or during initial
   brand-application approval — open question, see §8).
2. `payoutStatus` starts `UNVERIFIED`. **A brand with no verified payout details can
   still sell** (order/checkout flow is unaffected) — payouts simply accumulate as
   `AVAILABLE` and wait; nothing forces bank details up front, matching how creators
   aren't blocked from posting before their first sale either.
3. Admin manually verifies the details (v1: no automated bank-account-verification
   API — a real transfer or a manual check confirms it) and flips `payoutStatus:
VERIFIED`. A payout batch cannot be marked paid for a brand still `UNVERIFIED`
   (hard guard, not just a UI warning).

### 6.2 Checkout — per-brand payable snapshot

Extends `PRD-COMMERCE.md` §5.2/5.3 order-creation transaction. For each `OrderItem`,
in the same transaction that already creates the item and its `CreatorCommission` (if
attributed):

1. Look up the single active `PlatformCommissionRule`.
2. `grossAmount = unitPrice * qty`.
3. `platformFee = round(grossAmount * ratePercent / 100)`.
4. `gatewayFee` — `0` for COD; for eSewa/Khalti, an estimated flat/percentage figure
   configured alongside the rate (see §8 — exact gateway fee schedules aren't publicly
   fixed, so this is a configured estimate, reconciled against actual settlement
   reports out of band, not computed live per-transaction).
5. Create `BrandPayout{status: PENDING, ...}` — same "fine to create speculatively,
   void later if the sale falls through" reasoning already used for
   `CreatorCommission` (see `commissions/README.md`).
6. A COD order gets its `BrandPayout` row at checkout, same moment as its
   `CreatorCommission`. A wallet order does too — **not** deferred to payment
   settlement, because the payable record is an accounting entry, not a scarce
   resource; if the payment never completes, the reconciliation-driven void handles it
   (§6.3 point 3), matching exactly how commission voiding already handles a failed
   wallet payment.

### 6.3 Order lifecycle → payout availability

Rides the existing lifecycle-sweep infrastructure — same interval/mutex pattern as
payment reconciliation and commission lifecycle, ideally the **same sweep tick**
extended to also process `BrandPayout`, not a third parallel scheduler.

1. `PENDING` at order placement (§6.2).
2. ~7 days after `Order.deliveredAt` is stamped (same return-window constant as
   commissions — reuse `RETURN_WINDOW_MS`, don't fork a second value unless the
   business genuinely wants a different window for brands vs. creators — flag as an
   open question if so) → `AVAILABLE`. Same collapsed-approve-into-available
   transition as commissions (no separate holding period defined).
3. If the order is cancelled or its payment fails/expires before then → `VOIDED`,
   mirroring `commissionRepository.voidForOrder`'s scope (only reaches `PENDING`
   rows automatically — see next point).
4. **Late refund on an already-`AVAILABLE`/`WITHDRAWN` payout**: same accepted v1 gap
   `CreatorCommission` already carries ("a very late refund on an already-approved
   commission isn't handled" by the automatic sweep) — an admin voids it by hand with
   a required reason, same as `adminVoid` already does for commissions. A `WITHDRAWN`
   payout being voided does **not** auto-claw-back the bank transfer (can't — the
   money already moved); it's flagged for manual finance follow-up, same
   "surface for a human" principle used for `needsManualRefund`.

### 6.4 Admin — settlement (Payments Ops console)

**Superseded from an earlier push-batch design** (an admin proactively sweeping every
brand's balance on a fixed cycle) — the actual mechanism is the pull/withdraw-request
flow fully specified in `PRD-BANK-WITHDRAW.md` §3–§4: a brand requests a withdrawal
against its own `AVAILABLE` balance (policy-gated — minimum/maximum/window/cooldown,
`PRD-BANK-WITHDRAW.md` §3.1a), and admin reviews/approves/pays that specific request
from the same console described there, scoped to `ownerType: BUSINESS`.

What stays specific to _this_ PRD, not duplicated in the companion doc:

1. The `AVAILABLE` balance a brand can request against is exactly the live sum defined
   in §5.3 above (`SUM(BrandPayout.netAmount) WHERE status = 'AVAILABLE'`) —
   `PRD-BANK-WITHDRAW.md` §3.5 consumes this sum, it doesn't redefine it.
2. Marking a `WithdrawRequest` `PAID` reserves and flips the specific claimed
   `BrandPayout` rows to `WITHDRAWN` in the same transaction (§5's data model, above) —
   blocked if the brand's `payoutStatus` isn't `VERIFIED` (§6.1), same guard either
   design would need.
3. The line items behind any paid request are visible from both the admin console and
   the brand's own Payments tab (§6.6) — same "money moved, both sides see the same
   record" principle as the existing buyer-facing `TransactionLedger`.

### 6.5 Admin — platform financial rollup (new, not in original commerce PRD at all)

A single dashboard view answering "where is our money right now," computed from
existing tables plus the new ones — no new source-of-truth data, purely aggregation:

- **Gross collected** (sum of `PaymentTransaction{type: PAYMENT, status: SUCCEEDED}`)
  minus **refunded** (sum of `type: REFUND, status: SUCCEEDED`) = net held.
- **Owed to brands** (`BrandPayout` sum by status) and **owed to creators**
  (`CreatorCommission` sum by status, already exists via `sumByStatusForCreator` —
  extend to an all-creators admin variant).
- **Platform revenue realized** = sum of `platformFee` on `PAID` `BrandPayout` rows
  (i.e., don't count it as "earned" until the underlying sale is actually settled with
  the brand, matching the same conservative recognition already implied by the
  Pending/Available/Paid states elsewhere).
- Time-boxed (this cycle / last 30 days / all-time) — reuse existing pagination/
  date-range patterns already established in `apps/admin`.

This is the single most important addition for treating this as a _real financial
system_ rather than a set of disconnected ledgers — a finance-minded admin needs one
screen that reconciles "gateway says we received X" against "our own books say we owe
Y and have realized Z," not three separate queues they have to add up by hand.

### 6.6 Brand dashboard — Payments tab

New `/dashboard/payments`, added to the brand dashboard nav alongside the existing
Products/Orders entries (mirrors `EarningsSection`'s shape on the creator side almost
exactly — summary tiles + ledger is a proven pattern in this codebase, reuse it rather
than inventing new layout):

1. **Summary tiles**: Pending / Available / Paid (lifetime), same visual language as
   `EarningsSummaryTiles`.
2. **Ledger**: per-order-item rows (product, order id, gross/fee/net, status), same
   shape as `EarningsLedgerRow` with a `BrandPayoutStatusBadge` mirroring
   `CommissionStatusBadge`.
3. **Payout history**: list of this brand's `WithdrawRequest` rows (date, amount,
   status) — `PRD-BANK-WITHDRAW.md` §3.4, same shape as the creator side already needs
   for its own withdraw history, not a brand-specific concept.
4. **Bank details form** — add/update payout bank info (§6.1), shows current
   `payoutStatus` with a clear "pending verification" state so a brand isn't confused
   about why a payout hasn't landed.

## 7. Checkout-flow additions this PRD requires (answering "including checkout flow")

The buyer-facing checkout/payment flow itself does **not** change — a shopper still
only ever sees one order total, one payment, exactly as `PRD-COMMERCE.md` §5.2/5.3
already specify. What changes is purely server-side, inside the same transaction:

- Checkout's order-creation transaction gains one more atomic write per item
  (`BrandPayout`, §6.2) alongside the existing `CreatorCommission` write — same
  transaction boundary, no new failure mode introduced, no new external call.
- The eSewa/Khalti settlement path (`settleVerified`) needs no changes at all — it
  already only touches `PaymentTransaction`/`Order`/stock; `BrandPayout` lifecycle is
  driven entirely by delivery/return-window state, not by the payment-settlement
  event, exactly like `CreatorCommission` already is.
- Admin cancel/refund (`orders.cancel`) gains one more atomic write —
  `brandPayoutRepository.voidForOrder`, symmetric with the existing
  `commissionRepository.voidForOrder` call, in the same transaction.

So "the checkout flow" doesn't need new UI or new buyer-facing steps — it needs three
precise, transaction-scoped additions to code paths that already exist and already
follow this exact pattern for commissions.

## 8. Business rules requiring a decision before build

| Decision                                | Recommended default                                                                                                                                              | Why                                                                                                                                                           |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Platform take-rate model                | Single global `%` (e.g. 12%), stored so a per-brand override is possible later without a schema change                                                           | Matches "start simple, don't preclude the future" — a full negotiated-rate UI is real scope, not needed for v1                                                |
| Gateway fee handling                    | Configured flat estimate per provider (not looked up live per-transaction — no gateway API exposes it inline)                                                    | eSewa/Khalti fee schedules are commercial-agreement figures, not something the API returns per call                                                           |
| Withdrawal cadence &amp; bounds         | **Locked** — bi-weekly, NPR 3,000–500,000 (soft ceiling) per request, requester-initiated not admin-cycle-initiated. Full policy in `PRD-BANK-WITHDRAW.md` §3.1a | Supersedes the earlier "admin-triggered batch" idea in this row — pull model matches standard marketplace seller-payout UX (Daraz-style "request withdrawal") |
| Return-window length for brand payables | Reuse creator's existing `RETURN_WINDOW_MS` (7 days) unless the business wants brand and creator windows to diverge                                              | One fewer constant to keep in sync; diverge only if there's a real reason                                                                                     |
| Minimum payout threshold                | **Locked** — NPR 3,000 per request via `WithdrawPolicy.minAmount` (business), `PRD-BANK-WITHDRAW.md` §3.1a                                                       | Already answered by the withdraw policy itself; no separate field needed on `BrandPayout`                                                                     |
| Bank details collection timing          | Optional at brand-application time, required (soft-blocked at payout, not at selling) before first `PAID` batch                                                  | Don't add friction to brand onboarding for brands that may not sell for a while                                                                               |
| COD cash-remittance lag                 | Out of scope for this PRD's v1 — assume COD cash reaches Outfiqe's account through the existing delivery/logistics relationship before payout math applies       | A distinct operational question (delivery partner remittance terms), not a software gap                                                                       |

These are genuine product decisions, not implementation details — flag to the user
before chunk 1 of any build plan derived from this PRD, per root `CLAUDE.md`'s
"ask first when the _shape_ of a tradeoff is a real product decision."

## 9. Security & compliance

Same ASVS-aligned bar the rest of this codebase holds itself to (`CLAUDE.md`
"Security" section):

- `payoutAccountNumber` is sensitive financial PII — encrypted at rest (app-level
  encryption, not just relying on DB-at-rest encryption), never included in any
  API response beyond a masked form (`••••1234`) shown to the brand that owns it or an
  admin.
- Every `BrandPayout`/`WithdrawRequest` status-changing endpoint is `requireRole(ADMIN)`
  — a brand can only ever read its own rows or create a `WithdrawRequest`
  (`requireBrandId`-scoped, reusing the shared guard already extracted for `orders`),
  never approve/mark-paid its own request.
- Audit logging on every withdraw-request approval and mark-paid action: admin id,
  brand id, amount, timestamp — same principle as the existing auth audit-logging
  requirement, extended to financial actions since this is money leaving the platform.
- Bank-details changes trigger a notification to the brand's registered email (fraud
  signal — someone changing payout bank details should never be silent), same spirit as
  password-change notifications in `auth`.

## 10. Resilience & edge cases

- **Brand with zero sales** — Payments tab renders a proper empty state, not a
  blank/broken tile row (matches the codebase-wide empty-state requirement).
- **A `WithdrawRequest` claims a set of `AVAILABLE` rows, then a late refund voids one
  of them before the request is marked paid** — the request's amount was already
  snapshotted at claim time (`PRD-BANK-WITHDRAW.md` §3.5). Voiding a row already
  claimed by an unpaid request must either recompute the request's payable amount or
  reject the void with a clear "unclaim from the pending request first" flow.
  **Explicit open question for the build, not resolved here** — needs a decision
  before chunk implementation, flagged rather than silently picking one.
- **Brand suspended** (`payoutStatus: SUSPENDED`) — existing `AVAILABLE` payables stay
  visible but a new `WithdrawRequest` cannot be approved/paid until resolved; doesn't
  retroactively void anything already `WITHDRAWN`.
- **Multi-brand order, one brand's item refunded, other brand's item ships** — already
  proven safe at the `OrderItem`/commission level (chunk 16's brand-scoped item-level
  query); `BrandPayout` follows the identical per-item scoping, so this isn't a new
  risk, just confirming the existing design generalizes correctly.
- **Platform commission rate changes mid-flight** — never retroactively touches an
  already-created `BrandPayout.platformFee` (snapshot principle, §5/§6.2), exactly like
  `CommissionTier` edits already don't touch existing `CreatorCommission` rows.

## 11. Why manual transfer execution is the correct v1 design, not a shortcut

Documented here for anyone revisiting this later and wondering why there's no bank API
integration: real bulk-disbursement bank APIs require a corporate banking relationship
and their own KYC, separate from eSewa/Khalti entirely, and only pay for themselves once
manual per-cycle transfers become an actual bottleneck (dozens of brands, real ops
hours spent). Standard Nepali e-commerce practice — including at large-platform scale —
is: automate the _ledger_ (who's owed what, computed continuously and accurately),
keep the _transfer execution_ manual until volume justifies automating that one step.
This mirrors the exact "job logic vs. trigger mechanism" separation already used for
the reconciliation sweep (`shared/scheduling`) — building the ledger right now costs
nothing extra later; automating the transfer is a clean, isolated swap when the time
comes.

## 12. Suggested chunk plan

Not started — for review before locking, same process as the original 18-chunk
commerce plan:

1. Schema migration — `Brand` payout fields, `PlatformCommissionRule`, `BrandPayout`,
   enums. Seed one active global rate.
2. `payments`/`orders` extension — snapshot `BrandPayout` inside the existing
   checkout transaction (§6.2); voidForOrder inside the existing cancel transaction.
3. Lifecycle sweep extension — fold `BrandPayout` PENDING→AVAILABLE into the existing
   commission sweep tick (or a sibling function on the same schedule — decide based on
   how large a single sweep tick should get).
4. Admin — brand bank-details verification action + `payoutStatus` gating.
5. **`PRD-BANK-WITHDRAW.md`'s own build order (its §5, steps 1–7)** — bank accounts,
   `WithdrawPolicy`, withdraw-request creation/eligibility, admin review/mark-paid with
   ledger-row reservation, policy editor. This step _is_ §6.4 now — not built
   separately here.
6. Admin — platform financial rollup dashboard (§6.5).
7. Brand dashboard — Payments tab (§6.6): summary tiles, ledger, payout history
   (reuses `PRD-BANK-WITHDRAW.md`'s withdraw-request UI), bank details form.
8. Polish — empty/loading states, accessibility, the claimed-row-void edge case from
   §10 resolved per whatever decision comes out of review.

**How to apply:** read this alongside `PRD-BANK-WITHDRAW.md` and lock §8's open
decisions with the user first — same discipline the original commerce plan followed
(rejected/confirmed decisions before any code), not guessed defaults baked in silently.
