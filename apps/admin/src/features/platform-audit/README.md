# platform-audit

## Purpose

Read the platform audit log: every change platform staff made, newest first.

## Structure

- `PlatformAuditPage.tsx` — filters by action, target type and target ID; each entry shows the
  summary, who did it (and on whose behalf, when impersonating), when, the action, the target, and
  its details. Paged with "Load more"; loading, empty and error states.
- `api.ts`, `schemas.ts` — `GET /api/platform/audit` and its Zod mirror.

Route: `_authenticated.platform.audit.index.tsx` (`/platform/audit`). The "Audit log" sidebar item
is in `PLATFORM_NAV_ITEMS`. Needs `platform:audit:read`.

## Funnel

**User-facing:** open Audit log, optionally filter (for example target type `Outfit` and a build's
ID), and read what changed and why.

**Technical:** page → `usePlatformAuditLog` → `platformAuditApi` → `/api/platform/audit` →
`apps/api/src/modules/platform-audit`.
