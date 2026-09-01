# Platform Impersonation (apps/admin)

## Purpose

The platform-admin screen for starting and overseeing support impersonation sessions. Pick a
tenant and one of its members, give a reason and a scope, and start a time-boxed session; watch
every active session and revoke it; and review recent history. In the sidebar's Platform section
(needs `platform:access` plus `platform:impersonate`).

## Structure

- `schemas.ts` — Zod mirrors of the impersonation candidate, session summary, and start result.
- `api.ts` — `platformImpersonationApi` (`listCandidates`, `listActive`, `listHistory`, `start`,
  `revoke`).
- `PlatformImpersonationPage.tsx` — the start form (tenant `<Select>` reusing
  `platformMetricsApi.listTenants`, a member `<Select>` from `listCandidates`, a reason `<Input>`,
  a scope `<Select>`, an optional minutes `<Input>`), a result panel that reveals the minted
  access token behind a toggle, an active-sessions table with per-row revoke, and a recent-history
  table. `SessionTable` is a local, unexported sub-component shared by both tables.
- `PlatformImpersonationPage.integration.test.tsx`.

Route: `_authenticated.platform.impersonation.index.tsx` (`/platform/impersonation`); the
"Impersonation" sidebar item is in `PLATFORM_NAV_ITEMS`.

## Non-obvious rationale

- **The minted token is shown, not auto-applied.** The admin app can't hand the token to a tenant
  subdomain in-browser yet (see the API module's README), so the page reveals it for use with
  trusted support tooling instead of silently swapping the operator's own session.
- **Candidates come from a dedicated platform endpoint**, not a tenant member list — the operator
  is never inside the tenant, and platform staff are filtered out server-side so they can't be
  impersonation targets.
