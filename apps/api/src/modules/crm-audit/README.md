# CRM Audit

## Purpose

A per-tenant, append-only audit trail of the security-relevant changes to a CRM organization —
invites, membership and role changes, ownership transfers, organization rename, and subscription
state changes — plus the read endpoint (`GET /api/crm/audit`) the admin Audit tab renders. Records
who did what, when, from which IP, and the outcome; never a token, password hash, or reset link.

## Structure

- `crm-audit.constants.ts` — `AUDIT_READ_PERMISSION_KEY` (`audit:read`), page-size bounds, the
  `AUDIT_TARGET_TYPE` string map (`invite` / `membership` / `role` / `organization` /
  `ownership_transfer` / `subscription`).
- `crm-audit.types.ts` — `AuditActor` (`actorUserId` / `actorMembershipId` / `ipAddress`, all
  nullable), `RecordAuditInput`, `CrmAuditLogRecord`, `CrmAuditLogPage`.
- `crm-audit.utils.ts` — `buildAuditActor(req, res)`: pulls the caller's user id from
  `res.locals.auth`, the membership id from `res.locals.crmMembership` (set by `requirePermission`),
  and the IP from `req.ip`. Type-only import of `crm-access` types, so no runtime dependency on
  that module.
- `crm-audit.repository.ts` — `insert` (one `crmAuditLog.create`) and `list` (keyset pagination on
  `[createdAt desc, id desc]`, then one `user.findMany` to resolve actor names — `actorUserId` has
  no FK so the log survives actor deletion).
- `crm-audit.service.ts` — `crmAudit.record` (best-effort: wraps `insert` in try/catch and logs on
  failure, **never throws** — an audit write must not fail the action it records) and `list`
  (slices `limit + 1` to a page + `nextCursor`).
- `crm-audit.controller.ts` / `crm-audit.routes.ts` — `GET /api/crm/audit`, mounted at `/api/crm`
  in `app.ts`, gated `resolveTenant` → `requireAuth` → `requirePermission("audit:read")`.

## Funnel

**User-facing:** an Admin opens the CRM Audit tab and sees a reverse-chronological table (when /
who / action / details) with "Load more" paging.

**Technical:** the write side is called from the **controllers** of `crm-access` and `crm-billing`
(not their services — see Non-obvious rationale) right after the mutation succeeds:
`crmAudit.record({ organizationId, action, summary, actor, target, metadata })`. The read side is
`AuditPage` → `crmAuditApi.list` → `GET /api/crm/audit` → `crm-audit.controller` → `.service` →
`.repository` → Postgres.

## Non-obvious rationale

- **`crmAudit.record` is called from controllers, not services.** The plan sketch said "from the
  services", but every CRM mutation in this codebase has exactly one controller → service path, and
  the controller already holds `req`/`res` — so the actor (user id, membership id, IP) is available
  without threading an extra context parameter through ~15 service signatures and every internal
  caller and test. Recording in the controller captures every user-initiated mutation with less
  surface area and no risk to the existing service-level tests. Actions with no HTTP controller
  (scheduled billing jobs) are intentionally not audited here — they're system events already
  covered by `logger`.
- **The audit write is `await`ed, not fire-and-forget.** It's a single indexed insert and
  `record` can't throw, so blocking the response on it guarantees the entry exists before the
  caller sees `200` — worth the sub-millisecond cost for an audit trail.
- **`actorUserId` / `actorMembershipId` are plain nullable columns with no foreign key.** An audit
  entry must outlive the membership or user it refers to (someone deactivated, an org rebuilt), so
  the row is self-contained; actor _names_ for display are resolved with a separate `user.findMany`
  at read time and fall back to "System" when the id is null or the user is gone.
- **`summary` is a pre-rendered human sentence; `metadata` holds only safe descriptive fields**
  (`previousName`, `permissionCount`, `roleId`, `email`, `status`, `removeSenderMembership`, …).
  Nothing that touches a token, password hash, invite token, or raw provider payload is ever put
  in either — the `crm-audit.integration.test.ts` "never stores raw secrets" case asserts this.
- **`audit:read` is in `SELECTABLE_ROLE_PERMISSION_KEYS`**, so the built-in Admin role gets it
  automatically (Admin = every selectable key) and the built-in Member role does not (its key list
  is explicit and omits it). A tenant composing a custom role _can_ grant it — deliberately, so a
  compliance/reviewer role is possible — but it is never handed out by default beyond Admin.
- **The read endpoint is not behind `requireAdvancedCrmFeatures`.** Unlike Partners/Pipeline/
  Reports, an organization whose trial lapsed can still review its own audit history — locking a
  security record behind a paywall would be the wrong call.
