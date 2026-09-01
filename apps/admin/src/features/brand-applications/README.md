# Brand Applications (admin)

## Purpose

The admin-panel UI for reviewing brand applications submitted through the public site: a tabbed,
infinite-scrolling list filtered by status, with approve/reject actions.

## Structure

- `BrandApplicationsPage.tsx` — the page: status tabs (Pending/Approved/Rejected), the application
  list, and the approve/reject actions.
- `api.ts` — `brandApplicationsApi`, the typed client for `GET /brand-applications`,
  `POST /brand-applications/:id/approve`, `POST /brand-applications/:id/reject`.
- `hooks/useInfiniteBrandApplications.ts` — wraps `brandApplicationsApi.list` in React Query's
  infinite-query pattern, keyed by status tab.
- `schemas.ts` — Zod schemas for a brand application record and its status, shared by the API
  client and the hook.
- `schemas.test.ts` — colocated unit test for the schemas.
- `hooks/useInfiniteBrandApplications.integration.test.tsx` — colocated integration test; renders
  the hook against a mocked API (MSW) to verify the full fetch → parse → paginate path, and covers
  `brandApplicationsApi`'s approve/reject/list request shapes directly.
- `BrandApplicationsPage.integration.test.tsx` — colocated integration test; renders the page
  against a mocked API and asserts a failed approve/reject shows the server's message inline.

## Funnel

**User-facing:** an admin opens Brand Applications, switches between Pending/Approved/Rejected
tabs, scrolls to load more, and approves or rejects a pending application (rejecting can include
an optional reason, prompted inline). If an action fails — e.g. the API rejects the approval
because the applicant email already belongs to an account — the server's message shows inline
under that card and the application stays put.

**Technical:** `BrandApplicationsPage.tsx` → `useInfiniteBrandApplications` (or a direct
`brandApplicationsApi` call for approve/reject) → `brandApplicationsApi` → the API client
(`@/lib/apiClient`) → `apps/api`'s `brand-applications` module. On approve/reject success, the page
invalidates the `["brand-applications"]` query so the list refetches.
