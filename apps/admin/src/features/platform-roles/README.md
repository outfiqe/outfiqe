# platform-roles (admin)

## Purpose

The co-founder-only UI for defining platform staff roles and assigning them — the platform-side
counterpart to the CRM's `features/crm` Roles & Members screens, rendered on the admin Team page
instead of its own nav entry.

## Structure

- `api.ts` / `schemas.ts` — `platformRolesApi` and its Zod response shapes, hitting
  `/api/platform/{roles,permissions,team}` (see `apps/api/src/modules/platform-roles`).
- `PlatformRolesSection.tsx` — role list plus a create/edit/delete modal with a grouped permission
  checkbox matrix sourced from `GET /platform/permissions`. Same UX as the CRM's `RolesSection.tsx`,
  minus tenant-only concepts (no org rename, no ownership transfer, no per-viewer permission
  subsetting — every caller who reaches this component is already a co-founder, gated by
  `TeamPage.tsx`, so there's nothing to disable).
- `PlatformTeamSection.tsx` — active platform staff list with a role `<Select>` and an
  activate/deactivate button per row, mirroring the CRM's `MembersSection.tsx`.

## Funnel

**User-facing:** a co-founder opens Admin → Team. Alongside the existing invite form and invite
list, they now see the role list (create/edit/delete) and the current staff roster (reassign role,
deactivate). Everyone else sees only their own read-only view of the team page — this UI never
renders for a non-co-founder.

**Technical:** both sections call `platformRolesApi`, which hits the co-founder-gated
`/api/platform/roles` and `/api/platform/team` endpoints. The real access boundary is server-side
(`requireCoFounder` on every write); hiding this UI for non-co-founders in `TeamPage.tsx` is just
UX, the same "hiding the form is UX, not the security boundary" stance `features/team/README.md`
already states for the invite form.
