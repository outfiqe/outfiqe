# tag-reports (admin)

## Purpose

The platform-staff review queue for trust & safety reports on live creator product tags —
counterfeit / misleading tags reported by viewers, and counterfeit rejections escalated by
brands. Backed by `apps/api/src/modules/tag-reports`.

## Structure

- `TagReportsPage.tsx` — the `/tag-reports` route. Open / Actioned / Dismissed tabs
  (`useInfiniteTagReports` per status), an open-count line + tab badge (`tagReportsApi.openCount`),
  one card per report (look thumbnail, product + brand, reason, source, the reporter's note, and
  the creator's counterfeit-flag count when non-zero), and a "Resolve" action on open reports.
- `ResolveReportModal.tsx` — pick Actioned vs Dismissed, an optional resolution note, and — only
  when the tag is still live and the outcome is Actioned — a "Remove this tag" checkbox that sets
  `takeDownTag`.
- `api.ts` / `schemas.ts` — `GET /tag-reports` (`?status=`), `GET /tag-reports/open-count`,
  `POST /tag-reports/:id/resolve`.
- `hooks/useInfiniteTagReports.ts` — cursor-paginated list per status.

## Funnel

Sidebar → **Tag reports** (`tag-reports` is a nav-only `PLATFORM_NAV_KEYS` entry, gated by
`requirePlatformAccess` server-side, same as Support requests / Product reviews). A reviewer works
the Open tab, opens a report, reads the note, and resolves it — dismiss if it's nothing, or action
it (with "Remove this tag" to revoke a still-live tag immediately; the creator is notified through
the normal `PRODUCT_TAG_REVOKED` path). Resolving invalidates the `["tag-reports"]` query family so
the counts and lists refresh.

## Non-obvious rationale

**No bulk actions and no auto-refresh.** Report volume is expected to be low; each one wants a
human read of the note before a decision. A reviewer resolves them one at a time.

**"Remove this tag" is hidden once the tag isn't live.** If the brand already rejected it, or a
prior report took it down, there's nothing to revoke — the modal says so instead of offering a
no-op checkbox.
