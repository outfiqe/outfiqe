# Team

## Purpose

The admin dashboard's "Team" page: lets a platform staffer with team-management permission invite a new admin by email, and shows everyone who has an invite pending, accepted, or expired.

## Structure

- `TeamPage.tsx` — the whole feature is one page component: the invite form, the invite list, and the permission gate around the form.
- `api.ts` — `teamApi.list()` / `teamApi.invite(email, name)`, wrapping `GET`/`POST /admin/invites`.
- `schemas.ts` — Zod schemas/types for an invite row (`AdminInviteSummary`) and the list response envelope (`AdminInviteListResult`).

## Funnel

**User-facing:** a staffer with team-management access opens Team, fills in a name and email, and sends an invite. Everyone who can see the page (gated by platform nav access) sees the invite list either way; only someone who can actually manage the team sees the invite form itself — anyone else sees a note explaining why instead.

**Technical:** `TeamPage` → `teamApi.list` → `GET /admin/invites`, which returns both the invite rows and the caller's own `viewerPermissionKeys` (`admin-invites` module, API side) → the page shows the form only when that list includes `platform:team:manage`. Submitting the form calls `teamApi.invite` → `POST /admin/invites`, which the API independently re-checks and rejects with a 403 regardless of what the UI showed.

## Non-obvious rationale

- **Hiding the form is UX, not the security boundary** — the API enforces `platform:team:manage` on `POST /admin/invites` itself (see `apps/api/src/modules/admin-invites/README.md`), so this page's gate only avoids showing a form that would just fail. It mirrors `apps/admin/src/features/crm/CrmPage.tsx`'s `canInviteMembers`/`InviteSection` pattern: the parent decides whether to render the form at all, rather than the form rendering and then disabling itself.
