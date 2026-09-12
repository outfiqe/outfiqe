# Admin Invites

## Purpose

Lets an existing platform staffer invite someone new into the admin dashboard by email, and lists the invites sent so far. Registration itself (accepting the invite and creating the account) lives in the `auth` module, not here.

## Structure

- `adminInvite.routes.ts` — `POST /api/admin/invites` (send an invite), `GET /api/admin/invites` (list sent invites).
- `adminInvite.controller.ts` — reads the validated body/principal, calls the service, sends the response.
- `adminInvite.service.ts` — creates the invite record, emails the invite link, rejects an email that already has an account.
- `adminInvite.repository.ts` — Prisma access for `AdminInvite`, plus the co-founder lookup `list` uses to flag rows.
- `adminInvite.types.ts` — `AdminInviteRecord`, `CreateAdminInviteInput`, `AdminInviteSummary`, `AdminInviteStatus`, `AdminInviteListResult`.
- `adminInvite.schemas.ts` — Zod body schema for `POST /`.
- `adminInvite.utils.ts` — `toSummary`, mapping a record + co-founder flag to the list response shape.

## Funnel

**User-facing:** a platform staffer with team-management access opens the admin Team page, enters an email and name, and sends the invite. The invitee gets an email with a registration link; opening it and setting a password (handled by `auth`) creates their admin account. The Team page also lists every invite sent, its status (pending/accepted/expired), and whether it belongs to one of the platform's co-founders.

**Technical:** `adminInviteRoutes` → `adminInviteController.create`/`list` → `adminInviteService` → `adminInviteRepository` → Postgres via Prisma. `create` also calls `userRepository` (reject if the email already has an account) and `sendEmail` (best-effort; a delivery failure is logged, not thrown, so the invite record still exists even if the email didn't send). `list` also calls `platformAccessService.permissionKeysFor` and returns the caller's own platform permission keys alongside the invites, so the admin frontend can decide whether to show the invite form (`apps/admin/src/features/team`) without a separate "my permissions" endpoint. Acceptance is handled entirely by `auth.service.ts`, which reads the invite by hashed token and marks it accepted inside the same transaction that creates the user.

## Non-obvious rationale

- `POST /` requires the fine-grained `platform:team:manage` permission (via `requirePlatformRole`), on top of the router-level `requirePlatformAccess` + `requirePlatformNavItem("team")` gate that already covers both routes. Without it, any platform staffer with dashboard access at all — regardless of their assigned role's permissions — could create new admin accounts, which is a privilege-escalation path (invite yourself in with a more powerful role, or invite an outside collaborator). `GET /` stays behind the router-level gate only: listing pending invites doesn't grant anything, so it isn't worth requiring the extra permission.
- The built-in platform Admin role gets every `PLATFORM_PERMISSION_CATALOG` key, including `platform:team:manage`, automatically on every deploy (`prisma/seed-crm.ts`) — so this gate doesn't lock out existing admins, it only starts mattering for a custom, narrower role.
