# content-reports

## Purpose

The staff queue for content people reported on the storefront: Creator Looks, outfit builds, and
comments on either. Staff read each report in context and either dismiss it or remove the
content.

## Structure

- `ContentReportsPage.tsx` — the queue: Open / Actioned / Dismissed filter, each report with its
  reason, what was reported, a preview, the author's prior removals and a link to the content on
  the storefront, plus a Resolve button.
- `ResolveContentReportModal.tsx` — dismiss, or remove the content, with an optional note.
  Removing is turned off once the content is already gone.
- `contentReportTarget.ts` — `TARGET_NOUN` (post, comment, build, build comment) and
  `reportedContentHref`, the storefront link for a report's target (a look on its creator's
  profile, or `/builds/:id` for a build or build comment). Shared by the page and the modal.
- `api.ts`, `schemas.ts` — the `/api/content-reports` client and zod schemas.
- `hooks/useInfiniteContentReports.ts` — the paged queue.

## Funnel

**User-facing:** a staff member opens Content reports, reads the open reports, follows the link to
check the content on the storefront, and resolves each one.

**Technical:** `ContentReportsPage` → `useInfiniteContentReports` → `contentReportsApi` →
`GET /api/content-reports` and `POST /api/content-reports/:id/resolve` →
`apps/api/src/modules/content-reports`.
