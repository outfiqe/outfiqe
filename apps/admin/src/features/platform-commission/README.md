# Platform Commission (admin)

## Purpose

The admin console page for configuring the brand-side settlement rules the `brand-payouts` API
module applies at checkout: the tiered take-rate ladder, per-provider gateway fee estimates, and
time-boxed brand commission exemptions.

## Structure

- `PlatformCommissionPage.tsx` — composes the three sections below on one page.
- `CommissionTiersSection.tsx` — the price-band ladder editor. Loads the current active rule's
  tiers into an editable working copy (add/remove bands, per-band FLAT/PERCENT toggle),
  client-side validates the whole ladder (starts at Rs 0, contiguous, top band open-ended) before
  submitting the whole set as one new versioned rule via `POST /commission-rules`.
- `GatewayFeeRatesSection.tsx` — one small percent form per provider (eSewa, Khalti), each
  independently versioned via `POST /gateway-fee-rates`.
- `BrandExemptionsSection.tsx` — a brand-search autocomplete (`GET /brands?q=`, same pattern as
  `gamification`'s `BrandSponsorField`) plus start/end date and reason inputs to create an
  exemption, and a list with a Revoke action.
- `api.ts` — `platformCommissionApi`, all calls against `/brand-payouts/*` (plus `searchBrands`
  against the shared `/brands` search endpoint).
- `schemas.ts` — Zod response shapes.

## Funnel

**User-facing:** an admin opens Platform commission from the sidebar, edits the ladder/gateway
rates/exemptions, and every save immediately reflects in the live checkout computation — the next
order placed uses the newly-active configuration.

**Technical:** `PlatformCommissionPage` → each section's own `useQuery`/`useMutation` against
`platformCommissionApi` → `apps/api/src/modules/brand-payouts` → Prisma. Saving the tier ladder
replaces the whole active `PlatformCommissionRule` (and its tiers) as one new version; it does not
edit tiers individually, matching how the backend models the ladder as a single versioned set (see
that module's README for why).

## Non-obvious rationale

- The ladder editor client-side validates gap/overlap/floor/open-ended-top rules before submitting,
  purely for fast feedback — the backend's `createPlatformCommissionRuleSchema` is the actual source
  of truth and re-validates independently, so a bug in the client check can never let an invalid
  ladder through.
- No dedicated component tests were added for this page, matching this app's existing, consistent
  convention for list/CRUD admin pages (`commissions`, `withdraw-policy`, `financial-rollup`, none
  of which have dedicated tests either) — correctness here rests on the backend's own integration
  test suite plus a live-server, browser-driven verification pass (ladder creation, gateway rate
  versioning, and exemption create/list all exercised end-to-end against the running dev API).
