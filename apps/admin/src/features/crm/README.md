# CRM (apps/admin)

## Purpose

The visible screens for Outfiqe's internal CRM. Lets a staff member with CRM access view the
organization, see and manage CRM members, invite an existing staff account, accept a CRM invite,
manage the organization's paid subscription, browse the tenant brand's Partners (creators) and
Customers (shoppers), run a deal pipeline, log activities/tasks, work support tickets, and build
custom roles from the permission catalog, search across every CRM entity, read pipeline and
support reports, and review the organization's audit log — against the `/api/crm/*` endpoints in
`apps/api/src/modules/crm-access` (tenant/PBAC, ownership transfer, custom roles),
`apps/api/src/modules/crm-billing` (subscription), `apps/api/src/modules/crm-relationships`
(Partners/Customers), `apps/api/src/modules/crm-pipeline` (stages & deals),
`apps/api/src/modules/crm-activities` (activities, tasks, timeline),
`apps/api/src/modules/crm-tickets` (support), `apps/api/src/modules/crm-reporting`
(search + reports), and `apps/api/src/modules/crm-audit` (audit log).

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
- `billingApi.ts` / `billingSchemas.ts` — `crmBillingApi` (`getOverview`/`listInvoices`/`checkout`/
  `payInvoice`/`verifyInvoice`/`cancel`) + Zod mirrors of `/api/crm/billing/*` responses.
- `BillingPage.tsx` / `BillingSection.tsx` — plan + seat + status card, invoice history table,
  outstanding-renewal-invoice "Pay now" banner, and a "Cancel renewal" action. `PlanCheckoutModal.tsx`
  is the plan/seats/gateway picker; on submit it calls `checkout` (or `payInvoice` for an existing
  renewal invoice) and hands the redirect to `paymentRedirect.ts`.
- `paymentRedirect.ts` — turns a checkout redirect into a real navigation: `window.location` for
  Khalti's REDIRECT mode, an auto-submitted hidden `<form>` for eSewa's FORM_POST mode. This is a
  deliberate near-duplicate of `apps/web/src/features/payments/paymentRedirect.utils.ts`; lift both
  into `packages/utils` the next time payment redirects are touched in `apps/web`.
- `BillingReturnPage.tsx` — the page the gateway redirects back to; reads `?invoiceId`, calls
  `verifyInvoice` server-side, and reports COMPLETE / PENDING / FAILED.
- `PlanGateBanner.tsx` — shown above CRM content when `organization.advancedFeaturesEnabled` is
  false (trial ended, no active subscription), linking to `/crm/billing`.
- **Navigation lives in the app shell, not a per-page strip.** `AdminSidebar`
  (`components/AdminSidebar.tsx`) renders a flat "CRM" section — Overview / Partners / Customers /
  Pipeline / Tasks / Support / Reports / Roles / Audit / Billing — filtered by
  `isCrmSubItemVisible` (`components/AdminSidebar.utils.ts`): the viewer's permission keys (or org
  SUPERADMIN), and, for the brand-scoped items (Partners, Customers, Billing), whether the resolved
  organization has a `linkedBrandId` at all. The platform org has none, so a platform admin sees
  Overview / Pipeline / Tasks / Support / Reports / Roles / Audit but not the three that can only
  ever be empty for a brand-less org. The sidebar fetches `GET /api/crm/organization` itself, but only
  `enabled` while `pathname.startsWith("/crm")`, and on the same `["crm-organization"]` query key
  the pages already use — so React Query dedupes it and it costs no extra request. `AppShell`
  renders the two-tone `CRM` wordmark + `<CrmSearchBox>` centered in the header on `/crm/*` routes
  (excluding `/crm/invites/accept`). The pages themselves render only their own content plus, where
  relevant, `PlanGateBanner`. `useTanStackSidebarNavigation` supplies an `isActive` that matches
  `/crm` exactly (not as a prefix) so "Overview" isn't lit up on every sub-route.
- `auditApi.ts` / `auditSchemas.ts` / `AuditPage.tsx` — the Audit tab (`audit:read`): a
  reverse-chronological table (when / who / action / details) of the organization's security
  changes, `useInfiniteQuery` with a "Load more" cursor button, loading / error / empty states.
- `CrmSearchBox.tsx` — the always-present global search (`Autocomplete`, `useDebouncedValue`),
  hitting `GET /api/crm/search`. Results are grouped by entity (Partners / Customers / Deals /
  Tickets); selecting one navigates to its detail route (`/crm/partners/$creatorId`,
  `/crm/customers/$userId`) or the relevant tab (`/crm/pipeline`, `/crm/support`). Renders nothing
  for a viewer holding none of the four per-entity read permissions (the endpoint would 403).
- `reportingApi.ts` / `reportingSchemas.ts` — `crmReportingApi` (`getPipelineReport`,
  `getTicketReport`, `search`) + Zod mirrors of `/api/crm/reports/*` and `/api/crm/search`.
- `ReportsSection.tsx` / `ReportsPage.tsx` — the Reports tab. Pipeline card: open/won/lost stat
  tiles + a horizontal bar per open stage (single-series `bg-primary` fill, value direct-labelled,
  per-row `title` tooltip — see the dataviz method). Ticket card: open / resolved / mean-time-to-
  resolve tiles + a status-breakdown bar list. Each card has its own loading skeleton, error
  banner, and an explicit "not enough data yet" state for the first-record / no-data case.
- `RolesSection.tsx` / `RolesPage.tsx` — the Roles tab: an organization-rename card (shown to a
  viewer with `org:update`) plus the role list. Built-in roles show a badge and no controls;
  custom roles get Edit / Delete for a viewer with `roles:manage`. The role modal is a
  grouped permission-checkbox matrix (design-system `Checkbox`) built from `GET /crm/permissions`,
  with `platform:access` and `org:transfer_ownership` filtered out client-side (the API rejects
  them too). Delete surfaces the API's `ROLE_IN_USE` / `ROLE_IS_BUILT_IN` message inline.
- `relationshipsApi.ts` / `relationshipsSchemas.ts` — `crmRelationshipsApi`
  (`listPartners`/`getPartner`/`listCustomers`/`getCustomer`) + Zod mirrors of
  `/api/crm/partners*` and `/api/crm/customers*`.
- `PartnersPage.tsx` / `CustomersPage.tsx` — searchable, offset-paginated tables with a loading
  skeleton, an error banner, a distinct "not linked to a brand" empty state, and a plain "no
  partners/customers yet" empty state. Search is debounced via `useDebouncedValue`
  (`@outfiqe/hooks`).
- `contactsApi.ts` / `contactsSchemas.ts` — `crmContactsApi`
  (`listContacts`/`getContact`/`createContact`/`updateContact`/`deleteContact`) + Zod mirrors of
  `/api/crm/contacts*`.
- `ContactsPage.tsx` / `ContactFormModal.tsx` — the manually-managed contact list (search +
  lifecycle-stage filter + offset pagination) and the create/edit modal (name, email, phone,
  company, title, stage, source, comma-separated tags, owner from the members list, notes). The
  modal is keyed by contact id so its form state resets between create and each edit. Unlike
  Partners/Customers, Contacts is not brand-scoped, so its sidebar item has no `requiresLinkedBrand`.
- `PartnerDetailPage.tsx` / `CustomerDetailPage.tsx` — per-product breakdown + recent attributed
  orders (partner) / recent order history (customer), reached from a list row.
- `pipelineApi.ts` / `pipelineSchemas.ts` — `crmPipelineApi` (stage CRUD + reorder, deal CRUD) +
  Zod mirrors of `/api/crm/pipeline/*` and `/api/crm/deals`.
- `PipelinePage.tsx` — a `KanbanBoard` (`@outfiqe/components`) of stages → deals. `deals:write`
  gets a "New deal" button (`DealFormModal.tsx`, with a partner picker fed by
  `crmRelationshipsApi.listPartners`); `pipeline:configure` gets "Configure stages"
  (`StageConfigModal.tsx` — add / rename-less delete / up-down reorder). Moving a card patches the
  deal's `stageId`.
- `activitiesApi.ts` / `activitiesSchemas.ts` — `crmActivitiesApi` (timeline, log activity, task
  CRUD) + Zod mirrors of `/api/crm/timeline`, `/api/crm/activities`, `/api/crm/tasks`.
- `TimelineSection.tsx` — the merged Timeline (logged activity + live order rows) with an inline
  "log a note/call/message/email" composer, embedded on `PartnerDetailPage` / `CustomerDetailPage`.
  Shows a notice when the response is `partial`.
- `TasksPage.tsx` — the Tasks tab: a list of due-dated tasks with an overdue badge and a
  complete checkbox, plus a "New task" modal with an assignee picker (needs `members:read`).
- `ticketsApi.ts` / `ticketsSchemas.ts` — `crmTicketsApi` (list, get-with-comments, create,
  status change, assign, comment) + Zod mirrors of `/api/crm/tickets*`.
- `TicketsPage.tsx` — the Support tab: a status-filtered ticket list; clicking a row expands
  `TicketDetail.tsx` inline (description, forward-only status buttons, assignee `<Select>`,
  internal comment thread). "New ticket" modal collects type / title / description / customer.
- `format.utils.ts` — `formatRupees` / `formatDate` / `formatDateTime` / `formatDuration`
  (seconds → `2h 15m` / `3d 4h` / `—`), shared by every CRM screen instead of a per-file copy.

## Deferred follow-ups

- **`CRM_ITEM_ASSIGNED` in the notification bell.** The backend emits the event and writes a
  `Notification` (`crm-tickets` / `crm-activities` → `notifications`), but `packages/types`'
  hand-maintained `NotificationType` / `NotificationEntityType` unions — shared by `apps/web` and
  `apps/admin` — don't yet carry the CRM values, so the shared `NotificationRow` has no link rule
  for them. Widening those unions and adding the `/crm/support` / `/crm/tasks` link mapping is a
  cross-package change that also touches `apps/web`'s notification rendering; tracked separately.
- **Per-list status / owner / date-range filters** on Partners / Customers / Deals. Tickets
  already has a server-side status filter demonstrating the query-string → `where` pattern;
  extending it to the other lists is a follow-up.

Routes: `_authenticated.crm.index.tsx` (`/crm` → `CrmPage`),
`_authenticated.crm.invites.accept.tsx` (`/crm/invites/accept` → `AcceptInvitePage`),
`_authenticated.crm.billing.index.tsx` / `_authenticated.crm.billing.return.tsx`,
`_authenticated.crm.partners.index.tsx` (`/crm/partners` → `PartnersPage`),
`_authenticated.crm.partners.$creatorId.tsx` (`→ PartnerDetailPage`),
`_authenticated.crm.customers.index.tsx` (`/crm/customers` → `CustomersPage`),
`_authenticated.crm.customers.$userId.tsx` (`→ CustomerDetailPage`),
`_authenticated.crm.contacts.index.tsx` (`/crm/contacts` → `ContactsPage`), and
`_authenticated.crm.pipeline.index.tsx` (`/crm/pipeline` → `PipelinePage`),
`_authenticated.crm.tasks.index.tsx` (`/crm/tasks` → `TasksPage`),
`_authenticated.crm.support.index.tsx` (`/crm/support` → `TicketsPage`),
`_authenticated.crm.roles.index.tsx` (`/crm/roles` → `RolesPage`),
`_authenticated.crm.reports.index.tsx` (`/crm/reports` → `ReportsPage`),
`_authenticated.crm.audit.index.tsx` (`/crm/audit` → `AuditPage`) — the `.index`
suffix on the leaf routes is load-bearing, not stylistic: without it, TanStack Router's file-based
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
- **CRM chrome (the sidebar section, the header wordmark + search) lives in `AppShell` /
  `AdminSidebar`, not a `_authenticated.crm.tsx` layout route.** A layout route would be the
  natural home for shared chrome, but adding `_authenticated.crm.tsx` turns it into the parent of
  _every_ `/crm/*` route — including `/crm/invites/accept`, which a not-yet-a-member is on and must
  not see CRM chrome for. `AppShell` gates the header block on `pathname.startsWith("/crm") &&
!pathname.startsWith("/crm/invites/accept")`, and the sidebar CRM section is always present (its
  items just 404-guard themselves like any other admin route) — no routing-structure risk, and the
  routes stay flat leaf files.
- **`advancedFeaturesEnabled` rides on `GET /api/crm/organization`, not a separate billing fetch.**
  `crm-access`'s org-context response calls `crmBillingService.resolveAdvancedFeaturesForOrganization`,
  so `CrmPage` already knows whether to show `PlanGateBanner` without every viewer needing
  `billing:read`. The dedicated `BillingSection` still fetches `GET /api/crm/billing` for the full
  plan/seat/invoice detail, gated on `billing:read`.
- **`CrmPage.integration.test.tsx`'s render wrapper mounts a real `RouterProvider`**, not just a
  `QueryClientProvider`, because `CrmPage` now renders `<Link to="/crm/billing">` (directly and via
  `PlanGateBanner`). The wrapper builds a one-route memory router whose root component renders the
  test's `children`, the same minimal-router pattern `AcceptInvitePage.integration.test.tsx` and
  `BillingReturnPage.integration.test.tsx` already use.
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
