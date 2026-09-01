# Platform Audit

## Purpose

Outfiqe's internal, append-only record of its own platform staff acting on tenants — feature-flag
overrides, impersonation sessions, and (once the audit middleware lands) every state-changing
request made while impersonating. Distinct from `crm-audit`, which is a tenant's own record of its
own staff's actions and is visible to that tenant.

## Structure

- `platform-audit.constants.ts` — page-size default/cap and `PLATFORM_AUDIT_ACTION` (the known
  action strings other platform modules emit).
- `platform-audit.types.ts` — `RecordPlatformAuditInput`, `PlatformAuditListFilters`,
  `PlatformAuditLogRecord` (adds resolved actor / on-behalf-of names), `PlatformAuditLogPage`.
- `platform-audit.repository.ts` — `insert` (via the primary `prisma`) and `list` (via
  `prismaRead`, cursor-paginated, filterable by organization / actor / action, with a batched
  name join).
- `platform-audit.service.ts` — `record` swallows and logs any write failure so an audit miss
  never breaks the caller; `list` trims the over-fetched row and derives the next cursor.
- `platform-audit.schemas.ts` — Zod validation for the list query.
- `platform-audit.controller.ts` / `platform-audit.routes.ts` — `GET /api/platform/audit`, gated
  `requirePlatformRole("platform:audit:read")`.
- `platform-audit.integration.test.ts` — record + list, action filter, and the three ways the
  gate says no.

## Funnel

**User-facing:** a platform admin with `platform:audit:read` opens the platform audit view and
pages through what Outfiqe staff have done to tenants, optionally filtered to one tenant, actor,
or action.

**Technical:** `platform-audit.routes.ts` → `requirePlatformRole("platform:audit:read")`
(`requirePlatformAccess` then the key check) → `platform-audit.controller.ts` →
`platform-audit.service.ts` → `platform-audit.repository.ts` → Postgres (`prismaRead` for the
list). Writes come from other platform modules calling `platformAudit.record(...)`.

## Non-obvious rationale

- **No foreign keys.** `PlatformAuditLog` stores `actorUserId` / `organizationId` /
  `impersonationSessionId` as plain columns, not relations, so a deleted user, tenant, or session
  never cascades away the audit trail — an audit record is a detached historical fact. Names are
  resolved at read time with a best-effort join.
- **`list` reads through `prismaRead`, `insert` writes through `prisma`.** The audit view is a
  read-heavy, non-latency-critical query — exactly what the replica seam is for — while a write
  must hit the primary to be immediately visible to a follow-up read in the same request.
