# platform-audit

## Purpose

Read the platform audit log: every change platform staff made, newest first.

## Structure

- `components/PlatformAuditPage.tsx` — pick what happened, who did it and what it affected, or paste an
  exact item ID. A choice applies at once and stays in the URL. Each entry shows the summary, who did
  it (and on whose behalf, when impersonating), when, the action, the item and its details. Paged with
  "Load more"; loading, empty and error states.
- `components/AuditFilterPicker.tsx` — a searchable pick list built on the design system's
  `Autocomplete`, with a clear button.
- `utils/auditLabels.utils.ts` — turns stored codes like `support.ticket.status_changed` into plain words.
- `api/platformAuditApi.ts`, `api/platformAuditSchemas.ts` — `GET /api/platform/audit`,
  `GET /api/platform/audit/filters` and their Zod mirrors.

Route: `_authenticated.platform.audit.index.tsx` (`/platform/audit`). The "Audit log" sidebar item
is in `PLATFORM_NAV_ITEMS`. Needs `platform:audit:read`.

## Funnel

**User-facing:** open Audit log, optionally pick what happened, who did it or what it affected, and
read what changed and why.

**Technical:** page → `usePlatformAuditLog` → `platformAuditApi` → `/api/platform/audit` →
`apps/api/src/modules/platform-audit`.

## Non-obvious rationale

**The choices come from the log itself, not a fixed list in the page.** Actions are plain strings written all over the API, so a hand-kept list would go stale. If the choices fail to load, the log still shows and the pickers stay empty.
