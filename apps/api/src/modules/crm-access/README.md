# CRM Access

## Purpose

Foundation module for Outfiqe's internal CRM: the tenant/PBAC schema (`Organization`,
`Membership`, `Role`, `Permission`, `RolePermission`, `OrganizationInvite`) and the access layer
that grants existing `apps/admin` staff accounts CRM permissions — no second login, no public
signup. There is exactly one `Organization` row, seeded for Outfiqe itself; the schema stays
genuinely multi-tenant so it could be reopened to outside companies later without a rearchitecture,
but nothing here is built to sell it. The full 11-chunk roadmap (billing, Partners/Customers,
pipeline & deals, support/ticketing, the `apps/admin` CRM UI, custom-role builder, ownership
transfer, reporting) isn't checked into this repo as a doc yet — this module covers Chunks 1–2 only
(tenant/PBAC schema + access on existing admin auth).

## Structure

- `crm-access.types.ts` — record/summary/input types for every entity this module owns.
- `crm-access.constants.ts` — `PERMISSION_CATALOG` (the full permission key catalog, grouped) and
  `BUILT_IN_ROLE_PERMISSIONS` (the Admin/Member built-in role presets derived from it).
- `crm-access.repository.ts` — Prisma queries, every one scoped by `organizationId` where
  applicable. `acceptInvite` wraps the Membership-create + invite-accept pair in a transaction.
- `crm-access.utils.ts` — pure mappers: `toMembershipSummary`, `toInviteSummary` (derives
  PENDING/ACCEPTED/REVOKED/EXPIRED from an invite's timestamps, the same shape as
  `admin-invites/adminInvite.utils.ts`'s `toSummary`).
- `crm-access.service.ts` — business rules: invite target must already be an existing staff
  account, one pending invite per email, accept requires the invite's email to match the accepting
  account, the SUPERADMIN membership can't be edited via `updateMembership`.
- `crm-access.middleware.ts` — `requirePermission(key)`, stacked after `requireAuth` exactly like
  `#middlewares/require-role.js`. Lives here, not in `#middlewares/`, because it queries this
  module's own repository — a shared middleware depending on a module would invert this codebase's
  module → shared dependency direction.
- `crm-access.controller.ts` / `crm-access.routes.ts` — routes mounted at `/api/crm` in `app.ts`.
- `crm-access.schemas.ts` — Zod request validation.
- `crm-access.integration.test.ts` — end-to-end through `testApp` + a real test database.

`apps/api/prisma/seed-crm.ts` (invoked from `prisma/seed.ts`'s `main()`) seeds the permission
catalog, the single Organization, the built-in roles, and the first SUPERADMIN membership (on
whichever seeded `User` holds `UserRole.ADMIN`). It's idempotent — safe to re-run.

## Funnel

**User-facing:** an existing Outfiqe staff member with `members:invite` sends a CRM invite to
another staff member's email, picking a role. That person accepts the invite from their own
already-logged-in admin session — accepting is what actually grants them CRM access; nothing about
their `apps/admin` login changes.

**Technical:** `crm-access.routes.ts` → `requireAuth` (existing JWT session) → `requirePermission`
(resolves `Membership → Role → RolePermission` off the CRM repository, SUPERADMIN short-circuits)
→ `crm-access.controller.ts` → `crm-access.service.ts` → `crm-access.repository.ts` → Postgres.

## Non-obvious rationale

- **SUPERADMIN is not a `Role` row.** It's `Organization.superAdminMembershipId`, a direct FK to
  one `Membership` — so it can't be edited down, duplicated, or granted through the invite flow
  (`OrganizationInvite.roleId` only ever points at a real `Role`). It's set once by the seed
  script; moving it is a Chunk 9 "transfer ownership" action, not built yet.
- **`requirePermission` does one repository round-trip per request** (`getOrganization` +
  `findMembershipByUserAndOrg`) rather than embedding permissions in the JWT. With one Organization
  this is cheap; if this module ever needs to resolve which org a request belongs to (multi-org),
  that lookup is the one place that changes.
- **Inviting requires an existing `UserRole.ADMIN` account** (`userRepository.findByEmail`, then a
  role check) — there is no CRM signup. `acceptInvite` additionally checks the accepting account's
  email matches the invite's email, so a valid token can't be redeemed by a different logged-in
  staff member than the one it was addressed to.
- **`crm-access.repository.ts` only exposes what Chunks 1–2 need.** `updateOrganization`,
  role create/update/delete, and ownership transfer are deliberately not here yet — they belong to
  later chunks (custom-role builder, org settings UI, ownership transfer) and would be unused,
  unscoped code if added now.
