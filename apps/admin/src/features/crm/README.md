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
- `CrmPage.tsx` — the page shell: organization banner + `MembersSection` + `InviteSection`, each
  shown only if the viewer's own CRM role actually carries `members:read`/`members:invite`
  (`organization.viewerIsSuperAdmin`/`viewerPermissionKeys` from `GET /api/crm/organization` —
  see "Non-obvious rationale"). A role with neither (e.g. the built-in Member role) sees an
  explicit "nothing here for your role yet" message instead of a blank page.
- `MembersSection.tsx` — member list, role `Select`, deactivate/reactivate button per row, plus a
  "Transfer ownership" button on any `ACTIVE`, non-SUPERADMIN row (shown only when the viewer
  themselves is the SUPERADMIN and no transfer is already pending — takes `viewerIsSuperAdmin`/
  `hasPendingOwnershipTransfer` as props from `CrmPage`, since it otherwise only fetches the
  member/role lists itself). Disables the role `Select` and deactivate/reactivate button on the
  SUPERADMIN's own row rather than letting the user hit the API's `SUPERADMIN_MEMBERSHIP_LOCKED` 403.
- `OwnershipTransferBanner.tsx` — renders from `organization.pendingOwnershipTransfer`: Accept/
  Decline for the recipient (matched against `useAuth()`'s current user id), a Cancel option for
  the SUPERADMIN who sent it, nothing for anyone else.
- `InviteSection.tsx` — invite form (email + role) and the pending-invites list with revoke.
- `AcceptInvitePage.tsx` — the screen an already-logged-in staff member with no CRM access lands
  on after clicking the link in their invite email, mirroring
  `features/auth/RegisterInvitePage.tsx`'s loading/invalid/valid state-machine shape. Once the
  accept call succeeds, it also re-fetches `/api/auth/me` and pushes the result into
  `AuthContext` via `updateUser` — see "Non-obvious rationale" for why.

Routes: `apps/admin/src/routes/_authenticated.crm.index.tsx` (`/crm` → `CrmPage`) and
`_authenticated.crm.invites.accept.tsx` (`/crm/invites/accept` → `AcceptInvitePage`) — the `.index`
suffix on the first is load-bearing, not stylistic: without it, TanStack Router's file-based
convention treats `_authenticated.crm.tsx` as a layout parent for anything under `crm.*`
(including the accept route), and since `CrmPage` renders no `<Outlet/>`, the accept route would
never actually display (see the "Non-obvious rationale" section below). Both routes sit under the
existing `_authenticated` layout — accepting an invite still requires the caller to already be
logged in (`requireAuth`), it just isn't gated by `requirePermission` since accepting
is the action that grants the permission. Sidebar entry lives in `AdminSidebar.tsx`'s
`CRM_NAV_SECTIONS` — the one section always shown regardless of `hasPlatformAccess`, since CRM is
exactly what tenant-org-only staff are meant to reach (see `crm-access`'s README for the
`requirePlatformAccess`/`hasPlatformAccess` gating the rest of the sidebar goes through).

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

- **`GET /api/crm/organization` returns the viewer's own permission context alongside the
  organization** (`viewerIsSuperAdmin`, `viewerPermissionKeys` —
  `crm-access.utils.ts`'s `toOrganizationWithViewerContext`, populated from the `Membership`
  `requirePermission("org:read")` already resolved onto `res.locals.crmMembership`, no extra
  query). `CrmPage` uses it to hide `MembersSection`/`InviteSection` entirely for a role that
  can't use them, rather than rendering the section and letting it fail with a
  "You do not have permission to do this" error — a Member (built-in role) genuinely has no
  `members:read`/`members:invite`, and showing a control guaranteed to reject every request is
  worse than not showing it, the same reasoning the SUPERADMIN-row-disabling bullet below already
  applies to `MembersSection`'s own controls.
- **`AdminSidebar` always shows the CRM nav item to any signed-in admin-role user, regardless of
  which subdomain they're currently on or whether they have a membership there** — CRM access is
  tenant/subdomain-scoped, and the sidebar has no cheap way to know in advance whether the
  currently-resolved organization is one the viewer belongs to (that's exactly what
  `GET /api/crm/organization` determines, fetched only once `CrmPage` itself mounts). Lifting that
  query up to a shared layout so the sidebar could hide the link ahead of time would mean firing it
  on every admin page load, not just CRM ones — not worth the added request for what's a narrow
  edge case (visiting the wrong tenant's subdomain by URL). Instead, `CrmPage` detects the specific
  `FORBIDDEN` error from that fetch and swaps in a message pointing the viewer at checking they're
  on the right organization's subdomain, rather than the generic "You do not have permission to do
  this."
- **`apps/admin`'s login gate (`AuthContext.tsx`) accepts `BRAND_OWNER` accounts, not just
  `UserRole.ADMIN`.** A CRM organization can now be handed off to an existing business's own login
  (`features/organizations`'s business-picker onboarding) — that account has to actually be able to
  sign into `apps/admin` to see and accept the ownership transfer, or reach its org's CRM
  afterward. This doesn't widen what a `BRAND_OWNER` account can reach: `requirePlatformAccess`
  already denies non-`ADMIN` roles server-side (see `crm-access`'s README), and `AdminSidebar`
  already shows only the CRM nav item to any account without `hasPlatformAccess` — a business owner
  was already structurally incapable of reaching Outfiqe's own platform sections the moment they
  could get past the login gate at all; this change only lets them get past that gate.
- **`ProtectedRoute` preserves the current subdomain when bouncing a signed-out visitor to log in,
  instead of always using the fixed `VITE_WEB_URL`.** A tenant's own subdomain (e.g.
  `daraz.outfiqe.local`) also serves `apps/web`'s login page, proxied the same way it serves
  `/admin`, so redirecting there keeps the visitor on that same origin — necessary for an invited
  business owner clicking a CRM email link while signed out: bouncing to the bare configured domain
  instead would land them back on the wrong organization's CRM after signing in, the same class of
  bug the deep-link-path preservation fix (`redirect=`) already solved for the path, just for the
  host instead. `resolveLoginOrigin` (`ProtectedRoute.utils.ts`) falls back to the fixed configured
  URL when the current host isn't on that domain at all, which is what running `apps/admin`
  standalone against its own dev server (not proxied through `apps/web`) looks like.
- **The admin app's root route (`/`, "Brand applications") redirects to `/crm` for anyone without
  `hasPlatformAccess`** (`routes/_authenticated.index.tsx`). Without this, a tenant-only account
  landing on the bare `/admin` URL — which isn't in their sidebar, but is still directly
  reachable by URL since `hasPlatformAccess` only hides sidebar links, not routes — would see a
  broken-looking page with a real backend 403 underneath it (`requirePlatformAccess` correctly
  rejects the data fetch; the page just doesn't know to redirect instead of rendering). This
  covers only the root route, not every non-CRM page reached by direct URL — a full route-level
  guard for every admin page is a larger change not built yet.
- **Ownership transfer requires the recipient's acceptance, matching every other
  membership-changing action in this feature** — clicking "Transfer ownership" in
  `MembersSection` opens a confirm `Modal` (`@outfiqe/design-system`, same pattern as
  `ChallengesSection/CreateChallengeModal.tsx`) rather than transferring immediately; the actual
  handoff only happens once the target accepts via `OwnershipTransferBanner`. See
  `crm-access`'s README for why the backend enforces this the same way.
- **The transfer confirm modal's "Remove my own access after this transfer" checkbox defaults
  unchecked.** The sender decides per-transfer whether they should be removed from the org
  entirely once it's accepted, rather than the system guessing based on account type — see
  `crm-access`'s README for the full reasoning. When set, `OwnershipTransferBanner` shows the
  recipient an explicit note ("The current owner will be removed...") before they accept, since it
  materially changes what accepting does to the org's member list.
- **Text split across a `<strong>` tag can't be matched by a single `screen.findByText(/regex/)`
  in tests** — Testing Library matches one text node at a time by default, so
  `OwnershipTransferBanner`'s "Ownership transfer to **{name}** is pending…" renders as three
  separate text nodes. `CrmPage.integration.test.tsx` asserts on the name and the trailing phrase
  as two separate queries instead of one combined regex spanning the bolded name.
- **`AcceptInvitePage` re-fetches the current user after accepting, instead of relying on the
  session state already in `AuthContext`.** `requirePlatformAccess` grandfathers any account with
  zero `Membership` rows anywhere as having platform access (see `crm-access`'s README) — a
  brand-new invitee genuinely has zero memberships until the moment they accept, so the
  `hasPlatformAccess` value baked into their login response is stale the instant the invite is
  accepted (it flips from grandfathered-true to correctly-false). Without an explicit re-fetch,
  `AdminSidebar` would keep showing the full platform nav (Products, Orders, etc.) to a
  tenant-only account until an unrelated full page reload happened to re-run `AuthContext`'s
  bootstrap `/api/auth/me` call. This is UI staleness only, not a security gap — every real route
  still re-checks `requirePlatformAccess` live on the server regardless of what the sidebar shows.
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
