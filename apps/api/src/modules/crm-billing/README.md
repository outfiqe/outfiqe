# CRM Billing

## Purpose

Per-seat subscription billing for a CRM tenant organization: a 14-day no-card trial, paid plans
that unlock the advanced CRM features (pipeline, deals, tickets, reporting), and monthly renewal —
all on Outfiqe's existing eSewa/Khalti payment gateways, not Stripe. Nothing about _access_ to the
CRM is gated here; only the advanced feature set is.

## Structure

- `crm-billing.constants.ts` — `CRM_PLAN_CATALOG` (enum-keyed plan definitions: per-seat price,
  seat bounds), trial/period/renewal windows, reconciliation timings, checkout rate-limit config.
- `crm-billing.types.ts` — `Subscription`/`SubscriptionInvoice` record shapes, the checkout-redirect
  union, `BillingOverview`, and the `AdvancedFeatureGateInput` the gate rule takes.
- `crm-billing.utils.ts` — pure functions: `isAdvancedCrmEnabled` (the feature-gate rule),
  `getPlanDefinition`, `clampSeatsToPlan`, `calculateInvoiceAmount`, `toSubscriptionInvoiceRecord`.
- `crm-billing.repository.ts` — every Prisma query, scoped to a tenant via
  `subscription: { organizationId }` on invoice reads. `settleInvoiceAsPaid` claims the invoice
  with a status-guarded `updateMany` before advancing the subscription, inside one transaction.
- `crm-billing.service.ts` — checkout / pay-outstanding-invoice / verify / cancel business rules,
  the `CrmBillingProvider → PaymentProvider` registry, and `resolveAdvancedFeaturesForOrganization`
  (called by `crm-access`'s `GET /crm/organization` so the admin UI can gate without guessing).
- `crm-billing.controller.ts` / `crm-billing.routes.ts` — routes mounted at `/api/crm/billing` in
  `app.ts`, ahead of `/api/crm`; every route runs `resolveTenant` + `requireAuth` +
  `requirePermission("billing:read" | "billing:manage")` from `crm-access`.
- `crm-billing.schemas.ts` — Zod request validation.
- `crm-billing.jobs.ts` — `runCrmSubscriptionRenewalSweep` and `runCrmBillingReconciliationSweep`;
  their `{ name, run, intervalMs }` entries are composed into `src/jobs/scheduled-jobs.ts`.
- `*.integration.test.ts` — end-to-end through `testApp` with the providers mocked;
  `crm-billing.utils.test.ts` — the pure gate/pricing rules.

## Funnel

**User-facing:** a member with `billing:manage` opens `/crm/billing`, picks a plan + seat count +
gateway, and is redirected to eSewa/Khalti. On return, the page verifies the charge server-side and
the subscription flips to `ACTIVE`. Each month the renewal job opens the next invoice and emails
the billing contacts a pay link; an unpaid renewal shows as an outstanding invoice on the billing
page with a "Pay now" action. Letting a renewal lapse moves the subscription to `PAST_DUE` and,
after a grace window, `CANCELED` — at which point advanced CRM features are gated behind
`PlanGateBanner`.

**Technical:** `crm-billing.routes.ts` → `resolveTenant` → `requireAuth` → `requirePermission` →
`crm-billing.controller.ts` → `crm-billing.service.ts` → `PaymentProvider.initiate` /
`.verify` (the eSewa/Khalti singletons from `#modules/payments/providers`) → `crm-billing.repository.ts`
→ Postgres. The renewal and reconciliation sweeps run the same repository/service paths on a timer.

## Non-obvious rationale

- **In-house subscription state, because neither gateway has a recurring-billing object.** eSewa
  and Khalti are one-time-payment gateways — there's no provider-side subscription to mirror. The
  `Subscription` row (`status`, `currentPeriodEnd`, `cancelAtPeriodEnd`) is the source of truth;
  renewal is a scheduled job that opens the next `SubscriptionInvoice` and drives a fresh
  `provider.initiate`, exactly as the order-payments module already does for checkout.
- **`SubscriptionInvoice` carries its own charge state instead of reusing `PaymentTransaction`.**
  `PaymentTransaction.orderId` is a non-null FK to `Order`; making it nullable + adding a
  subscription link would be an invasive change to the live checkout path. A subscription invoice
  is a distinct domain object, so its `provider` / `providerRef` / `rawResponse` / `paidAt` live on
  the invoice row — the _reused_ part is the `PaymentProvider` interface, not a second generic
  ledger.
- **The redirect back from the gateway is never trusted.** `POST /billing/invoices/:id/verify`
  makes a server-to-server `provider.verify` call and only then marks the invoice `PAID` and
  advances the subscription — the same rule `orders`/`payments` already follow. The reconciliation
  sweep re-runs that verify for invoices stuck `OPEN`, and voids them after the 60-minute expiry
  window (mirrors `payment.reconciliation.ts`).
- **`settleInvoiceAsPaid` is claim-first.** It flips the invoice `OPEN → PAID` with a
  status-guarded `updateMany` and bails if that claimed zero rows, so a double verify (user + the
  reconciliation sweep racing) advances the subscription exactly once.
- **Checkout can never sell fewer seats than the org has active members** (`Math.max(clampSeatsToPlan(...), activeSeatCount)`),
  and the renewal invoice is priced off the subscription's current seat count — so seat changes in
  `crm-access` flow into billing without a separate sync.
- **The advanced-feature gate lives here but is surfaced through `crm-access`.**
  `isAdvancedCrmEnabled` only needs the organization's `isPlatformOrg`/`trialEndsAt` and the
  `Subscription` row, so `crm-access`'s org-context response calls
  `crmBillingService.resolveAdvancedFeaturesForOrganization`. The dependency is one-directional:
  `crm-billing` imports `crm-access`'s middleware/utils; `crm-access`'s controller imports
  `crm-billing`'s service; no file sits on both sides, so there's no import cycle.
- **The renewal invoice is opened without a provider attached.** A renewal doesn't know which
  gateway the org will use this cycle, so the job creates an `OPEN`, provider-less
  `SubscriptionInvoice` and emails a pay link; `POST /billing/invoices/:id/pay` attaches the chosen
  provider and initiates payment against that existing invoice.
