# Platform Impersonation

## Purpose

Lets a platform admin trade their session for a short-lived token that acts **as** a specific
tenant admin. This change is the session lifecycle only: minting, listing, and revoking. The
`requireAuth` branch that honours the token and the per-request audit middleware land in the
following changes.

## Structure

- `platform-impersonation.constants.ts` — TTL (30 min default, 60 min cap), the `read`/`write`
  scope list, and the `"impersonation"` actor-`via` marker.
- `platform-impersonation.token.ts` — `mintImpersonationToken`: an access-token-only JWT (no
  refresh) with `sub` = the tenant user and an RFC-8693-style `act` claim `{ sub: impersonator,
via: "impersonation", sid, scope }`, signed with the same secret/audience/issuer as a normal
  access token but with the impersonation TTL.
- `platform-impersonation.repository.ts` — `ImpersonationSession` CRUD plus `findActiveMembership`
  / `isPlatformStaff` (its own `prisma.membership` / `prisma.organization` reads — the platform
  module does not import a `crm-*` repository).
- `platform-impersonation.service.ts` — `start` (guards: `impersonation.allowed` feature on for
  the org, target is an ACTIVE member, target is not platform staff, one active session per
  impersonator+org; then create + mint + `impersonation.start` audit), `revoke`
  (own session, or any with `platform:impersonate:manage`; `impersonation.end` audit),
  `listActive`, `listHistory`.
- `platform-impersonation.schemas.ts` / `.controller.ts` / `.routes.ts` —
  `POST /api/platform/impersonation`, `GET /impersonation/active`, `GET /impersonation` (history),
  `DELETE /impersonation/:sessionId`, all `requirePlatformRole("platform:impersonate")`.
- `platform-impersonation.integration.test.ts`.

## Non-obvious rationale

- **No refresh token.** The whole time-limit guarantee falls out of never minting one — when the
  30-minute access token expires the session is simply over and a fresh, re-audited grant is
  required.
- **The `ImpersonationSession` row is the kill switch.** A stateless JWT can't be un-issued; the
  row is what the `requireAuth` branch (next change) checks so a revoked session 401s the very
  next request even while the JWT is still inside its `exp`.
- **`approvedById` is reserved but unused** — a later "write scope needs a second platform admin's
  approval" flow fills it without a migration.
