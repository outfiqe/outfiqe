# Platform Impersonation (apps/admin)

## Purpose

The platform-admin screen for starting and overseeing support impersonation sessions. Pick a
tenant and one of its members, give a reason and a scope, and start a time-boxed session; open it
in a new tab as that member, watch every active session and revoke it, and review recent history.
In the sidebar's Platform section (needs `platform:access` plus `platform:impersonate`).

## Structure

- `schemas.ts` — Zod mirrors of the impersonation candidate, session summary, start result, and
  open (hand-off) result.
- `api.ts` — `platformImpersonationApi` (`listCandidates`, `listActive`, `listHistory`, `start`,
  `revoke`, `open`).
- `PlatformImpersonationPage.tsx` — the start form (tenant `<Select>` reusing
  `platformMetricsApi.listTenants`, a member `<Select>` from `listCandidates`, a reason `<Input>`,
  a scope `<Select>`, an optional minutes `<Input>`), a result panel that reveals the minted
  access token behind a toggle, an active-sessions table with a per-row "Open" and "Revoke", and a
  recent-history table. `SessionTable` is a local, unexported sub-component shared by both tables.
  "Open" calls `platformImpersonationApi.open`, then `buildImpersonationHandoffUrl`
  (`@/lib/impersonationHandoff`) to open a new tab at the tenant's own subdomain with a one-time
  code in the query string — never the token itself.
- `PlatformImpersonationPage.integration.test.tsx`.

Route: `_authenticated.platform.impersonation.index.tsx` (`/platform/impersonation`); the
"Impersonation" sidebar item is in `PLATFORM_NAV_ITEMS`.

## Non-obvious rationale

- **"Open" and the revealed token are two different paths for two different needs**, not one
  superseding the other. "Open" is the fast path for browsing the tenant's CRM as that member
  (see `@/lib/impersonationHandoff` and the API module's README for the code-exchange design);
  the revealed token is for trusted support tooling that isn't a browser at all (curl, an internal
  script) and stays behind its own reveal toggle so it's never shown by accident.
- **Candidates come from a dedicated platform endpoint**, not a tenant member list — the operator
  is never inside the tenant, and platform staff are filtered out server-side so they can't be
  impersonation targets.

## Form validation

The start form uses react-hook-form with `impersonationForm.schema.ts`: a tenant, a member to act as, a reason of at least 3 characters (the audit trail needs it), and optional minutes from 1 to 60 (the API's own cap). Picking a different tenant clears the chosen member.
