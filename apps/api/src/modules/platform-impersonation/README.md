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

The same `act` branch is also the read-bias guard: any non-`GET`/`HEAD`/`OPTIONS` request under a
`scope !== "write"` session gets `403 IMPERSONATION_READ_ONLY` before it reaches any route
handler. This applies to every route in the app, not an explicit allowlist — a route-level
`denyDuringImpersonation` middleware used to cover this for a hand-picked set of mutation routes
(ownership-transfer, `PATCH /members/:id`, `crm-billing`'s manage routes), which meant a new
mutation route was read-write by default unless someone remembered to wire it in. It was removed
once the check moved into `requireAuth`.

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
  scope list, the `"impersonation"` actor-`via` marker, the hand-off exchange code's TTL (60s),
  and the redeem endpoint's IP rate limit.
- `platform-impersonation.token.ts` — `mintImpersonationToken`: an access-token-only JWT (no
  refresh) with `sub` = the tenant user and an RFC-8693-style `act` claim `{ sub: impersonator,
via: "impersonation", sid, scope }`, signed with the same secret/audience/issuer as a normal
  access token but with the impersonation TTL.
- `platform-impersonation.repository.ts` — `ImpersonationSession` CRUD plus `findActiveMembership`
  / `isPlatformStaff` / `listImpersonationCandidates` / `findOrganizationSubdomain` (its own
  `prisma.membership` / `prisma.organization` reads — the platform module does not import a
  `crm-*` repository), `findActiveForOrganization` / `listActiveForOrganization`
  (tenant-visibility reads), and `listOrganizationLog` (the tenant-facing `impersonation.*` slice
  of `PlatformAuditLog`).
- `platform-impersonation.service.ts` — `start` (guards: `impersonation.allowed` feature on for
  the org, target is an ACTIVE member, target is not platform staff, one active session per
  impersonator+org; then create + mint + `impersonation.start` audit + a best-effort email to the
  target), `revoke` (own session, or any with `platform:impersonate:manage`; `impersonation.end`
  audit), `listActive`, `listCandidates`, `listHistory`, `createExchangeCode` /
  `redeemExchangeCode` (the browser hand-off — see below), plus the tenant-facing
  `findActiveForOrganization` / `tenantLog` / `endAllForOrganization` (each active session revoked
  with an `impersonation.end` audit attributed to the tenant user).
- `platform-impersonation.schemas.ts` / `.controller.ts` / `.routes.ts` —
  `POST /api/platform/impersonation`, `GET /impersonation/active`, `GET /impersonation/candidates`,
  `GET /impersonation` (history), `DELETE /impersonation/:sessionId`, all
  `requirePlatformRole("platform:impersonate")`; `POST /impersonation/:sessionId/open` (same
  permission, plus "own session or `platform:impersonate:manage`") mints the hand-off code; and
  `POST /impersonation/redeem` (public, IP rate-limited) exchanges it for the token.
- The tenant side lives on the CRM router (`crm-access.controller` / `.routes`):
  `GET /api/crm/organization/impersonation-log` (`audit:read`) and
  `POST /api/crm/organization/end-impersonation` (`org:update`), and
  `GET /api/crm/organization` now carries
  `activeImpersonation: { byName, since, targetUserName } | null` and `viewerIsImpersonating`
  (true only when the viewer's own request is riding the impersonation token, so `apps/admin`'s
  `ImpersonationActivityBanner` can tell "someone else is in here" from "this is me").
- `platform-impersonation.integration.test.ts`, `impersonation-auth.integration.test.ts`,
  `impersonation-audit.integration.test.ts`, `impersonation-tenant-visibility.integration.test.ts`.

## Browser hand-off

The admin app's "Open" button on an Active sessions row exchanges the session for a one-time code
rather than putting the access token itself in a URL: `POST /impersonation/:sessionId/open` mints
a fresh token for the session's remaining TTL, stores it in Redis under an opaque code with a 60s
expiry (`IMPERSONATION_EXCHANGE_CODE_TTL_SECONDS`), and returns `{ code, tenantSubdomain }`. The
admin app opens `https://<tenantSubdomain>.<baseDomain>/admin/crm?impersonation_code=<code>` in a
new tab; that tab's `AuthContext` (`apps/admin/src/features/auth/AuthContext.tsx`) sees the query
param before attempting its normal cookie-based refresh, calls
`POST /impersonation/redeem { code }`, and on success sets the returned access token as its
session exactly like a normal login. The redeem uses Redis `GETDEL` so the code is single-use even
under a race, and a spent, unknown, or expired code 410s with `IMPERSONATION_CODE_INVALID` — the
admin app shows a plain "this link expired" screen instead of bouncing to the login page (see
`ImpersonationLinkExpired.tsx`).

## Non-obvious rationale

- **No refresh token.** The whole time-limit guarantee falls out of never minting one — when the
  30-minute access token expires the session is simply over and a fresh, re-audited grant is
  required.
- **The `ImpersonationSession` row is the kill switch.** A stateless JWT can't be un-issued; the
  row is what the `requireAuth` branch (next change) checks so a revoked session 401s the very
  next request even while the JWT is still inside its `exp`.
- **`approvedById` is reserved but unused** — a later "write scope needs a second platform admin's
  approval" flow fills it without a migration.
- **The browser "act as" hand-off exchanges a one-time code, never the raw JWT, across the origin
  boundary.** `apps/admin` is served from both the platform's own host and every tenant's
  subdomain (`resolveTenant` in `crm-access.middleware.ts` resolves the organization from the
  request's hostname, not from the caller's membership), so an in-memory access token held by the
  platform admin's tab can't simply be handed to a tab on the tenant's subdomain — a fresh origin
  has no way to read another origin's in-memory state. Putting the token itself in the URL would
  also leave it in browser history and server logs. The one-time code sidesteps both: it is
  meaningless outside the 60-second Redis entry it names, and `GETDEL` means even a doubled
  request (a retry, a preloader) can only ever redeem it once.
- **The reveal-behind-a-toggle token on the Start-session panel stays.** It exists for trusted
  support tooling that isn't a browser (curl, an internal script) and for anyone who wants the raw
  token instead of a redirect. The "Open" button is a faster path for the common case, not a
  replacement for it.
