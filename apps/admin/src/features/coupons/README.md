# Coupons (admin)

## Purpose

The admin control surface for platform-funded coupons (`apps/api/src/modules/coupons`) — create and
manage coupons, approve a large budget before it can go live, watch spend against budget, pull a
per-coupon performance report, and look up a redemption for support.

## Structure

- `api.ts` — `couponsApi`: `list` (status-filterable, paginated), `create`, `getById`,
  `updateStatus`, `approve`, `updateBudget`, `getPerformance`, `searchRedemptions`.
- `schemas.ts` — Zod response schemas (`couponSchema`, `couponPerformanceSchema`,
  `couponRedemptionSchema`) and the plain input types the create/update calls send.
- `hooks/useInfiniteCoupons.ts`, `hooks/useInfiniteRedemptions.ts` — `useInfiniteCursorPage`
  wrappers, same pattern as `withdraw-requests`.
- `hooks/useCouponPerformance.ts` — a plain `useQuery`, enabled only once a coupon is selected.
- `CouponsPage.tsx` — the routed page (`/coupons`), two tabs: Coupons and Redemption lookup.
- `CouponsListSection.tsx` — the coupon list: status tabs, budget progress bar, and the
  approve/pause-activate/archive/edit-budget/performance actions.
- `CreateCouponModal.tsx` — the new-coupon form.
- `CouponPerformanceModal.tsx` — `StatCard` grid over `GET /:id/performance`.
- `RedemptionLookupSection.tsx` — search by coupon code or order id; a released redemption shows its
  `releasedReason` inline as the support-facing refusal/reversal reason, and a velocity-flagged
  redemption shows a "Flagged for review" badge plus its `flagReason`.

## Funnel

**User-facing:** an admin opens Coupons from the Platform nav section, sees coupons grouped by
status with a live budget bar, creates a new one via the modal, approves/pauses/archives with one
click, and can search for a specific redemption from the second tab when a support ticket references
a coupon.

**Technical:** `CouponsPage` → `CouponsListSection`/`RedemptionLookupSection` → `api.ts` →
`GET/POST/PATCH /api/admin/coupons/*` → `coupon.controller.ts` → `coupon.service.ts`.

## Non-obvious rationale

- **No eligibility-scope picker in the create form** — `POST /admin/coupons` already accepts an
  `eligibility` array (brand/category/product/product-type rows), but building brand/product/category
  autocomplete pickers is a separate, sizeable UI task on its own. This admin UI only creates
  whole-catalogue coupons (empty eligibility) for now; a coupon that needs scoping can still be
  created with eligibility rows directly against the API, or this picker can be added as a follow-up
  without any API change.
- **"Edit budget" is a `window.prompt`, not a form field** — matches this codebase's existing
  admin-action pattern for a single-value edit (`withdraw-requests`' reject-reason/payment-reference
  prompts) rather than introducing a second modal for one number.
- **The "requires prepaid" note is a static recommendation, not a live calculation** — an earlier
  version of this feature tried enforcing "coupons over Rs 200 must be prepaid" server-side
  regardless of the coupon's own `prepaidOnly` flag; it was reverted because it silently overrode an
  admin's explicit choice to allow a higher-value coupon on COD. The create form now just shows the
  recommendation as a note next to the checkbox — the admin decides.
- **The nav key is server-enforced** (`coupons` is in `SERVER_ENFORCED_PLATFORM_NAV_KEYS`,
  `packages/utils/src/platform-nav`) — an admin whose access to this section has been hidden via
  Navigation access loses the API routes too (`requirePlatformNavItem("coupons")`), not just the
  sidebar link, matching `withdraw-requests`/`financial-rollup`.
