# CRM (apps/admin)

## Purpose

The first visible screen for Outfiqe's internal CRM (Chunk 4 of the roadmap in
`docs/PRD-CRM.md`). Lets a staff member with CRM access view the organization, see and manage
CRM members, invite an existing staff account, and accept a CRM invite — all against the
`/api/crm/*` endpoints built in Chunks 1–2 (`apps/api/src/modules/crm-access`). No pipeline,
deals, billing, or custom-role UI yet — those are later chunks.

## Structure

- `schemas.ts` — Zod schemas/types mirroring the API's response shapes
  (`Organization`, `Role`, `MembershipSummary`, `OrganizationInviteSummary`), the same "mirror
  the backend, parse on the way in" pattern as `features/team/schemas.ts`.
- `api.ts` — `crmApi`, thin `apiClient` calls + schema `.parse()`, one function per
  `/api/crm/*` endpoint this UI uses.
- `CrmPage.tsx` — the page shell: organization banner + `MembersSection` + `InviteSection`.
- `MembersSection.tsx` — member list, role `Select`, deactivate/reactivate button per row.
  Disables both controls on the SUPERADMIN's row rather than letting the user hit the API's
  `SUPERADMIN_MEMBERSHIP_LOCKED` 403.
- `InviteSection.tsx` — invite form (email + role) and the pending-invites list with revoke.
- `AcceptInvitePage.tsx` — the screen an already-logged-in staff member with no CRM access lands
  on after clicking the link in their invite email, mirroring
  `features/auth/RegisterInvitePage.tsx`'s loading/invalid/valid state-machine shape.

Routes: `apps/admin/src/routes/_authenticated.crm.index.tsx` (`/crm` → `CrmPage`) and
`_authenticated.crm.invites.accept.tsx` (`/crm/invites/accept` → `AcceptInvitePage`) — the `.index`
suffix on the first is load-bearing, not stylistic: without it, TanStack Router's file-based
convention treats `_authenticated.crm.tsx` as a layout parent for anything under `crm.*`
(including the accept route), and since `CrmPage` renders no `<Outlet/>`, the accept route would
never actually display (see the "Non-obvious rationale" section below). Both routes sit under the
existing `_authenticated` layout — accepting an invite still requires the caller to already be
logged in (`requireAuth`), it just isn't gated by `requirePermission` since accepting
is the action that grants the permission. Sidebar entry added to `AdminSidebar.tsx`'s
`NAV_SECTIONS`.

## Funnel

**User-facing:** a staff member with `members:invite` opens CRM → Invite a staff member, enters
an existing colleague's email and picks a role, hits Send. That colleague gets a real email (via
the existing `sendEmail`/Gmail pipeline) with a link into `/crm/invites/accept?token=...`; opening
it while logged in immediately grants them access and lets them continue into `/crm`.

**Technical:** `CrmPage`/`MembersSection`/`InviteSection` → `crm-access/api.ts` (`apiClient`) →
`apps/api`'s `/api/crm/*` routes → `crm-access.controller.ts` → `.service.ts` → `.repository.ts`
→ Postgres. Every list is a plain `useQuery`; every mutation invalidates its list's query key on
success and surfaces the API's error message via `getErrorMessage`/`toast.error` (or an inline
`FormBanner` for the invite form, matching `TeamPage.tsx`'s convention).

## Non-obvious rationale

- **The SUPERADMIN's role `Select` and deactivate button are disabled client-side**, even though
  the backend already rejects the underlying request (`403 SUPERADMIN_MEMBERSHIP_LOCKED`). This
  is UX, not a security boundary — the real enforcement is server-side in
  `crm-access.service.ts`; disabling here just avoids offering a control guaranteed to fail.
- **Roles are fetched with a plain `useQuery(["crm-roles"], ...)` in both `MembersSection` and
  `InviteSection`** rather than lifted into `CrmPage` and passed down as props — React Query
  dedupes identical query keys within the same cache, so this costs one network request, not two,
  while keeping each section self-contained.
- **`_authenticated.crm.index.tsx`, not `_authenticated.crm.tsx`.** TanStack Router's file-based
  routing treats a bare `X.tsx` as the layout parent for any `X.<segment>.tsx` sibling that
  exists — the moment `_authenticated.crm.invites.accept.tsx` existed, a bare
  `_authenticated.crm.tsx` silently became a parent route requiring an `<Outlet/>` to ever show
  its children. `CrmPage` has no `<Outlet/>`, so the accept route matched (`/crm/invites/accept`
  in the URL bar, correct search params) but rendered nothing but the parent's own `CrmPage`
  content — same failure mode this codebase already solved for `orders`
  (`_authenticated.orders.index.tsx` + `_authenticated.orders.$orderId.tsx`, no bare
  `_authenticated.orders.tsx`) and `gamification/badges`
  (`_authenticated.gamification.badges.tsx` deliberately reduced to `() => <Outlet />`). The
  `.index` suffix marks a route as "the exact leaf here, no children, no outlet required," which
  is what `/crm` actually is.
