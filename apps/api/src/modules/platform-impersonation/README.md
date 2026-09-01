# Platform Impersonation

## Purpose

Lets a platform admin trade their session for a short-lived token that acts **as** a specific
tenant admin — time-boxed, server-revocable, audited on every request, and visible to the tenant it
touches.

`requireAuth` (`#middlewares/require-auth.ts`) now has an `act` branch: when a token carries
`act.via === "impersonation"` it loads the `ImpersonationSession` by `act.sid`, rejects with
`401 IMPERSONATION_ENDED` unless `revokedAt` is null and `expiresAt` is in the future (and the
token subject matches the session target), and stamps
`res.locals.auth.impersonation = { sessionId, byUserId, organizationId, scope }`. Everything
downstream (`requirePermission`, controllers) is unchanged because `sub` is the tenant user.

`denyDuringImpersonation` (`#middlewares/deny-during-impersonation.js`) is the read-bias guard:
`403 IMPERSONATION_READ_ONLY` when `impersonation` is set and its scope isn't `write`. Wired onto
the ownership-transfer routes, `PATCH /members/:id`, and the `crm-billing` manage routes as the
reference set — extend it to any other privileged mutation.

`impersonationRequestAudit` (`platform-impersonation.audit.ts`, mounted `app.use("/api/crm", …)`
before the CRM routers) registers a `res.on("finish")` hook that reads `res.locals.auth` _after_
the route's `requireAuth` has run: when the request was impersonated it writes one
`tenant.request` platform-audit row (`method`, route template `path`, `statusCode`,
`impersonationSessionId`, `onBehalfOfUserId`) for every state-changing request and a 5% sample of
GETs, and touches `lastSeenAt` at most once a minute per session. The
`impersonation-session-reap` interval job (hourly) sets `revokedAt` on any session past its
`expiresAt` so the "active" queries stay clean.

## Structure

- `platform-impersonation.constants.ts` — TTL (30 min default, 60 min cap), the `read`/`write`
  scope list, and the `"impersonation"` actor-`via` marker.
- `platform-impersonation.token.ts` — `mintImpersonationToken`: an access-token-only JWT (no
  refresh) with `sub` = the tenant user and an RFC-8693-style `act` claim `{ sub: impersonator,
via: "impersonation", sid, scope }`, signed with the same secret/audience/issuer as a normal
  access token but with the impersonation TTL.
- `platform-impersonation.repository.ts` — `ImpersonationSession` CRUD plus `findActiveMembership`
  / `isPlatformStaff` / `listImpersonationCandidates` (its own `prisma.membership` /
  `prisma.organization` reads — the platform module does not import a `crm-*` repository),
  `findActiveForOrganization` / `listActiveForOrganization` (tenant-visibility reads), and
  `listOrganizationLog` (the tenant-facing `impersonation.*` slice of `PlatformAuditLog`).
- `platform-impersonation.service.ts` — `start` (guards: `impersonation.allowed` feature on for
  the org, target is an ACTIVE member, target is not platform staff, one active session per
  impersonator+org; then create + mint + `impersonation.start` audit + a best-effort email to the
  target), `revoke` (own session, or any with `platform:impersonate:manage`; `impersonation.end`
  audit), `listActive`, `listCandidates`, `listHistory`, plus the tenant-facing
  `findActiveForOrganization` / `tenantLog` / `endAllForOrganization` (each active session revoked
  with an `impersonation.end` audit attributed to the tenant user).
- `platform-impersonation.schemas.ts` / `.controller.ts` / `.routes.ts` —
  `POST /api/platform/impersonation`, `GET /impersonation/active`, `GET /impersonation/candidates`,
  `GET /impersonation` (history), `DELETE /impersonation/:sessionId`, all
  `requirePlatformRole("platform:impersonate")`.
- The tenant side lives on the CRM router (`crm-access.controller` / `.routes`):
  `GET /api/crm/organization/impersonation-log` (`audit:read`) and
  `POST /api/crm/organization/end-impersonation` (`org:update`), and
  `GET /api/crm/organization` now carries
  `activeImpersonation: { byName, since } | null`.
- `platform-impersonation.integration.test.ts`, `impersonation-auth.integration.test.ts`,
  `impersonation-audit.integration.test.ts`, `impersonation-tenant-visibility.integration.test.ts`.

## Non-obvious rationale

- **No refresh token.** The whole time-limit guarantee falls out of never minting one — when the
  30-minute access token expires the session is simply over and a fresh, re-audited grant is
  required.
- **The `ImpersonationSession` row is the kill switch.** A stateless JWT can't be un-issued; the
  row is what the `requireAuth` branch (next change) checks so a revoked session 401s the very
  next request even while the JWT is still inside its `exp`.
- **`approvedById` is reserved but unused** — a later "write scope needs a second platform admin's
  approval" flow fills it without a migration.
- **The browser "act as" hand-off is deliberately out of scope here.** Tenants are served from
  their own subdomain, so an in-memory access token can't be carried across origins by a same-tab
  navigation — a safe hand-off needs a fragment exchange plus rework of the admin app's
  `AuthContext` session restore, which is its own reviewed change. Until then the platform
  Impersonation screen surfaces the minted token behind a reveal toggle for use with trusted
  support tooling, and the session lifecycle / audit / tenant-visibility surface is fully live.
