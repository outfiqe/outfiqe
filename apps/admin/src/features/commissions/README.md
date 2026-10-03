# Commissions (admin)

## Purpose

The admin Commissions page: set the price bands for Creator Look commission and for Build
commission, test what a price would earn, read the history of band changes, and review the
commission rows people and brands have earned.

## Structure

- `CommissionsPage.tsx` — the routed page. For each kind of commission (Creator Look, Build) it
  shows the tier list, the price test and the change history, then the list of commissions.
- `CommissionTiersSection.tsx` — one kind's price bands (`scope` prop): add, edit and delete, a
  warning on every band that overlaps another, and a banner when any do.
- `TierPriceTestBox.tsx` — "Test a price": the band and commission a whole-rupee price would get.
- `TierChangeHistory.tsx` — every add, edit and removal of a band, with what it was and what it
  became, who did it and when.
- `CommissionsListSection.tsx` — commission rows by status, with approve, void and mark-paid.
  Each row names who earns it; a brand's share of a Build commission is marked "Brand".
- `commissionScopeCopy.ts` — title and description for each kind.
- `commissionQueryKeys.ts` — query keys; `tierChangeQueryKeys(scope)` lists what a band change
  must refresh (the bands, the history and any price-test answers).
- `hooks/useInfiniteCommissions.ts`, `hooks/useInfiniteTierHistory.ts` — cursor-paged lists.
- `api.ts` — `commissionsApi`; every tier call takes the scope.
- `schemas.ts` — Zod mirrors of the API's responses.
- `tierForm.schema.ts` — the tier form's validation.

## Funnel

**User-facing:** an admin opens Commissions, edits the bands for the kind of commission they
want, checks a few prices in "Test a price", and can see who changed what in the history below.
Further down they review commissions and approve, void or mark them paid.

**Technical:** components → `api.ts` → `apiClient` → `GET/POST /api/commissions/tiers?scope=`,
`PATCH/DELETE /api/commissions/tiers/:id?scope=`, `GET /api/commissions/tiers/price-test`,
`GET /api/commissions/tiers/history`, `GET /api/commissions`,
`POST /api/commissions/:id/approve|void|mark-paid` → `apps/api/src/modules/commissions`.

## Non-obvious rationale

Overlapping bands are allowed by the API (the band with the higher minimum wins), so the screen
warns instead of blocking. Editing and deleting send the scope too, so a band id from one kind of
commission can never change the other.
