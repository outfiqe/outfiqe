# Admin Invites

## Purpose

Lets a co-founder invite someone new into the admin dashboard by email, on a specific platform
role, and lists the invites sent so far. Registration itself (accepting the invite and creating the
account) lives in the `auth` module, not here; the role catalog itself lives in `platform-roles`.

## Structure

- `adminInvite.routes.ts` — `POST /api/admin/invites` (send an invite), `GET /api/admin/invites` (list sent invites).
- `adminInvite.controller.ts` — reads the validated body/principal, calls the service, sends the response.
- `adminInvite.service.ts` — validates the chosen role exists in the platform org, creates the invite record, emails the invite link, rejects an email that already has an account or already has a pending invite.
- `adminInvite.repository.ts` — Prisma access for `AdminInvite`, the co-founder lookup `list` uses to flag rows, `findPendingByEmail` (blocks a duplicate pending invite), and `countPendingByRoleId` (used by `platform-roles` to block deleting a role still referenced by an unaccepted invite).
- `adminInvite.types.ts` — `AdminInviteRecord`, `AdminInviteWithRoleName`, `CreateAdminInviteInput`, `AdminInviteSummary`, `AdminInviteStatus`, `AdminInviteListResult`.
- `adminInvite.schemas.ts` — Zod body schema for `POST /`, including the required `roleId`.
- `adminInvite.utils.ts` — `toSummary`, mapping a record + role name + co-founder flag to the list response shape.

## Funnel

**User-facing:** a co-founder opens the admin Team page, enters an email and name, picks a platform
role from the same list `platform-roles` manages, and sends the invite. The invitee gets an email
with a registration link; opening it and setting a password (handled by `auth`) creates their admin
account already enrolled on that exact role — not on a default. The Team page also lists every
invite sent, its status (pending/accepted/expired), which role it grants, and whether it belongs to
one of the platform's co-founders.

**Technical:** `adminInviteRoutes` → `adminInviteController.create`/`list` → `adminInviteService` →
`adminInviteRepository` → Postgres via Prisma. `create` also calls `userRepository` (reject if the
email already has an account, `409 USER_EXISTS`), `adminInviteRepository.findPendingByEmail`
(reject if that email already has an unaccepted, unexpired invite, `409 INVITE_ALREADY_PENDING` —
an expired invite doesn't block a fresh one), `crmAccessRepository` (resolve the platform org and
confirm the role belongs to it — `404 ROLE_NOT_FOUND` otherwise), and `sendEmail` (best-effort; a
delivery failure is logged, not thrown, so the invite record still exists even if the email didn't
send). `list` also calls `platformAccessService.permissionKeysFor` and returns the caller's own
platform permission keys alongside the invites. Acceptance is handled entirely by `auth.service.ts`,
which reads the invite by hashed token, marks it accepted, and grants a platform-org `Membership` on
the invite's `roleId` (via `crmAccessService.grantPlatformStaffMembership`) inside the same
transaction that creates the user.

## Non-obvious rationale

- `POST /` requires `requireCoFounder`, not the delegable `platform:team:manage` permission it used
  before roles existed. Once an invite carries a role, sending one is itself a privilege grant — a
  role that holds `platform:team:manage` must never be able to invite someone onto an even more
  powerful role, which only a fixed, capped co-founder set (not a permission key) can guarantee.
  `GET /` stays behind the router-level `requirePlatformAccess` + `requirePlatformNavItem("team")`
  gate only: listing pending invites doesn't grant anything.
- The built-in platform "Admin" role still gets every `PLATFORM_PERMISSION_CATALOG` key
  automatically on every deploy (`prisma/seed-crm.ts`) and remains a selectable option when
  inviting — for when a co-founder deliberately wants to grant someone full access. It's just no
  longer the _only_ option, or the silent default.
- **The `add_admin_invite_role` migration backfills every existing invite onto the platform org's
  built-in "Admin" role before making `role_id` `NOT NULL`.** Invites already in flight were sent
  under the old rule where every new admin got full access, so they keep exactly that behavior; only
  invites created after this change carry an explicitly chosen role. On an empty database the
  backfill touches zero rows and the constraint applies cleanly.
- **The emailed link is built from `ADMIN_URL`, which must be the bare base domain.** Production
  once had `ADMIN_URL=https://admin.outfiqe.com/admin`, so platform invites pointed at an `admin.`
  host that staff never use. It is now `https://outfiqe.com/admin`, and `env.config.ts` refuses to
  boot when `ADMIN_URL` sits on a reserved subdomain of `TENANT_BASE_DOMAIN`. Tenant CRM invites are
  unaffected — they build their own subdomain link (`buildOrganizationAdminUrl`) from the same
  value and land on `/crm`, while platform invitees land on `/platform`.
- **`findPendingByEmail` mirrors `crm-access`'s `findPendingInviteByEmail` / `INVITE_ALREADY_PENDING`
  exactly** — same check, same error code, same message — so a co-founder can't fire off two invite
  emails (two live tokens) to the same address before either is used. Only unexpired,
  not-yet-accepted invites count; once an invite expires, that email is free to be re-invited
  without waiting on anything.
