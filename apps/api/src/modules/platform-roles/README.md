# platform-roles

## Purpose

Lets co-founders define custom, narrower roles for Outfiqe's own platform staff — a "Finance only"
or "Support only" admin instead of the previous all-or-nothing choice between the built-in "Admin"
(every `platform:*` permission) and "Member" (none) — and reassign an existing staff member's role
or access.

## Structure

- `platform-roles.service.ts` — resolves the platform `Organization` and delegates to
  `crmAccessRepository`'s generic, already organization-scoped Role/Membership CRUD
  (`createRole`/`updateRole`/`deleteRole`/`findRoleById`/`countMembershipsForRole`/`listRoles`/
  `listMemberships`) and to `crmAccessService.updateMembership` for team role reassignment. The
  only genuinely new logic is validating submitted permission keys against
  `PLATFORM_PERMISSION_KEYS` (`platform-access.constants.ts`) instead of the CRM's own
  `SELECTABLE_ROLE_PERMISSION_KEYS` — the two catalogs are deliberately never merged (see
  `crm-access/README.md` and the CRM role-picker fix that preceded this module).
- `platform-roles.utils.ts` — `findUnselectablePlatformPermissionKeys`, the platform-catalog analog
  of `crm-access.utils.ts`'s `findUnselectablePermissionKeys`.
- `platform-roles.controller.ts` — thin: validate → service → `sendSuccess`, then
  `platformAudit.record` for every mutation (role create/update/delete, team member role/status
  change).
- `platform-roles.routes.ts` — mounted at `/api/platform`. Reads (`GET /permissions`, `GET /roles`,
  `GET /team`) need `platform:team:manage` (`platformGuards.teamManage`) — the roster and role
  catalog belong to whoever manages staff, not to every staff member. Every write is
  `requireCoFounder` + `crmWriteRateLimit`.
- `platform-roles.schemas.ts` — Zod for the write bodies/params, mirroring `crm-access.schemas.ts`'s
  role schemas.
- `platform-roles.types.ts` — re-exports `crm-access.types.ts`'s `RoleWithPermissions`/
  `MembershipSummary`/`PermissionRecord` rather than redefining them.

## Funnel

**User-facing:** a co-founder opens Admin → Team, which now also shows a role list (with a
create/edit/delete modal built from the platform permission catalog, grouped the same way the CRM's
role picker is) and the current staff roster with a role dropdown per person. Inviting a new admin
now requires picking one of these roles; accepting the invite enrolls the new admin directly onto
that role, not onto "Admin" by default.

**Technical:** `GET /api/platform/permissions` and `GET /api/platform/roles` back the permission
checkbox matrix and role list. `POST/PATCH/DELETE /api/platform/roles` create, edit, and delete
custom roles (built-in roles are read-only, same as the CRM). `GET /api/platform/team` lists active
platform memberships; `PATCH /api/platform/team/:membershipId` reassigns a role or flips
active/deactivated status by calling `crmAccessService.updateMembership` directly against the
platform organization — its existing guards (can't edit your own membership, can't edit the
`Organization.superAdminMembershipId` membership this way, can't grant a role with permissions
beyond the actor's own grant) apply unchanged.

## Non-obvious rationale

- **A role saved here now limits exactly what its members can do.** The ticked permissions are
  stored as-is; there is no hidden key added behind the scenes. Holding any platform permission
  makes someone platform staff, and every platform route checks its own permission (see
  `platform-access/README.md`), so a role with only the support permissions reaches the support
  pages and is refused everywhere else. The menu and the login landing page follow the same
  permissions through the session.

- **Co-founder-gated, not permission-gated.** Every write here requires `requireCoFounder`, not the
  delegable `platform:team:manage` permission that gates sending an invite's _email_. A role that
  carries `platform:team:manage` must never be able to grant itself or anyone else more power —
  that's a privilege-escalation path a fixed, capped co-founder set closes and a permission key
  can't. `admin-invites`'s `POST /` route was changed to `requireCoFounder` for the same reason: a
  role-carrying invite is itself a privilege grant.
- **Reused, not reimplemented, at the data layer.** `crmAccessRepository`'s Role/Membership CRUD is
  already generic over `organizationId` — tenant resolution (`resolveTenant`, Host-header
  subdomain lookup) is only how the CRM's own routes _find_ that id, not something baked into the
  repository functions themselves. This module just resolves "the platform org" once
  (`findPlatformOrganization`) and calls the same functions `platform-access.service.ts` already
  imports `crmAccessRepository` directly for.
- **`crmAccessService.updateMembership`'s escalation guard is effectively a no-op here by design.**
  Every caller reaching `updateTeamMember` already passed `requireCoFounder`, and co-founders are
  granted `[...PLATFORM_PERMISSION_KEYS]` as their acting grant (`isSuperAdmin: true` short-circuits
  the check entirely) — see `platform-access.service.ts`'s `permissionKeysFor`, which now also
  treats `Membership.isPlatformSuperAdmin` (not just `Organization.superAdminMembershipId`) as
  full-access, a correctness fix required so a freshly bootstrapped co-founder (seeded onto the
  now-zero-access "Member" role, see below) still has real platform access.
- **Deleting a role blocks on pending invites too, not just active memberships.** The CRM's
  `deleteRole` only checks `Membership` rows; a platform role can also be referenced by a not-yet-
  accepted `AdminInvite.roleId` (`ON DELETE RESTRICT`), so `deleteRole` here additionally counts
  pending invites before deleting, with the same `ROLE_IN_USE` error either way.
- **The seed backfill (`prisma/seed-crm.ts`'s `seedPlatformStaffMemberships`) now defaults to the
  zero-access "Member" role, not "Admin".** That backfill only exists as a safety net for admin
  accounts that reach the platform org outside the real invite flow (bootstrap scripts, historical
  data) — a secure-by-default fallback, not a demotion of anyone already on "Admin" (existing staff
  were left untouched at rollout; only the fallback default changed).
