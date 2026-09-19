# Team

## Purpose

The admin dashboard's "Team" page: lets a co-founder invite a new admin by email onto a specific
platform role, manage the platform role catalog, and reassign or deactivate existing platform
staff. Everyone else sees the invite list read-only.

## Structure

- `TeamPage.tsx` — the invite form (name, email, role), the invite list, and — for co-founders only
  — the `platform-roles` feature's `PlatformRolesSection` and `PlatformTeamSection`.
- `api.ts` — `teamApi.list()` / `teamApi.invite(email, name, roleId)`, wrapping `GET`/`POST /admin/invites`.
- `schemas.ts` — Zod schemas/types for an invite row (`AdminInviteSummary`, now including `roleId`/`roleName`) and the list response envelope (`AdminInviteListResult`).

Role/permission management itself (the role list, the permission picker, the staff roster) lives in
`apps/admin/src/features/platform-roles`, not here — this page only composes it.

## Funnel

**User-facing:** a co-founder opens Team, fills in a name, email, and role, and sends an invite.
Below the invite form, they also see the platform role list and the current staff roster. Everyone
who can see the page (gated by platform nav access) sees the invite list either way; only a
co-founder sees the invite form, the role manager, and the staff roster — anyone else sees a note
explaining why instead.

**Technical:** `TeamPage` → `teamApi.list` → `GET /admin/invites` for the invite rows, and (only
when `state.user.isCoFounder`) `platformRolesApi.listRoles` → `GET /platform/roles` to populate the
invite form's role picker. Submitting the form calls `teamApi.invite` → `POST /admin/invites`, which
the API independently re-checks with `requireCoFounder` and rejects regardless of what the UI
showed.

## Non-obvious rationale

- **Hiding the form is UX, not the security boundary** — the API enforces `requireCoFounder` on
  `POST /admin/invites` itself (see `apps/api/src/modules/admin-invites/README.md`), so this page's
  gate only avoids showing a form that would just fail. It mirrors
  `apps/admin/src/features/crm/CrmPage.tsx`'s `canInviteMembers`/`InviteSection` pattern: the parent
  decides whether to render the form at all, rather than the form rendering and then disabling
  itself.
- **The gate switched from a permission key (`platform:team:manage`) to `state.user.isCoFounder`.**
  Once an invite carries a role choice, sending one is itself a privilege grant, so the UI gate now
  matches the server's `requireCoFounder` check exactly instead of a delegable permission that a
  narrower role could still hold.
