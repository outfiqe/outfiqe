# CRM Access

## Purpose

Foundation module for Outfiqe's internal CRM: the tenant/PBAC schema (`Organization`,
`Membership`, `Role`, `Permission`, `RolePermission`, `OrganizationInvite`,
`OwnershipTransferRequest`) and the access layer that grants existing `apps/admin` staff accounts
CRM permissions — no second login, no public signup. Tenant resolution is genuinely
multi-tenant-capable — every request is resolved to an organization by subdomain (with a
single-org fallback), not by grabbing whichever row exists first. Nothing here is built to sell
the product externally (no public signup, no per-org frontend) — the resolution mechanism is just
built correctly from day one so a second organization doesn't require a rearchitecture. This
module owns the tenant/PBAC schema, access on the existing admin auth, custom-role CRUD, and
ownership transfer. The rest of the CRM (billing, Partners/Customers, pipeline & deals,
activities/tasks, support/ticketing, reporting, audit log) lives in the sibling `crm-*` modules;
`docs/PRD-CRM.md` is the product-level reference across all of them.

## Structure

- `crm-access.types.ts` — record/summary/input types for every entity this module owns.
- `crm-access.constants.ts` — `PERMISSION_CATALOG` (the full permission key catalog, grouped),
  `SELECTABLE_ROLE_PERMISSION_KEYS` (the catalog minus `platform:access` and
  `org:transfer_ownership` — the set a custom role is allowed to grant), and
  `BUILT_IN_ROLE_PERMISSIONS` (the Admin/Member built-in role presets derived from it).
- `crm-access.repository.ts` — Prisma queries, every one scoped by `organizationId` where
  applicable. `acceptInvite` wraps the Membership-create + invite-accept pair in a transaction, as
  does `acceptOwnershipTransfer` (moves `Organization.superAdminMembershipId` + marks the request
  accepted).
- `crm-access.utils.ts` — pure mappers: `toMembershipSummary`, `toInviteSummary` (derives
  PENDING/ACCEPTED/REVOKED/EXPIRED from an invite's timestamps, the same shape as
  `admin-invites/adminInvite.utils.ts`'s `toSummary`), `toOrganizationWithViewerContext` (adds the
  calling membership's own `viewerIsSuperAdmin`/`viewerPermissionKeys` plus any
  `pendingOwnershipTransfer` onto the organization response, so `apps/admin` can decide what to
  render without guessing at a 403), `toPendingOwnershipTransferSummary`,
  `extractSubdomain(host, baseDomain)` (a re-export of `@outfiqe/utils`' `extractTenantSubdomain`,
  which `apps/web` and `apps/admin` also use to gate the storefront ⇄ CRM links; `SUBDOMAIN_REGEX`
  and `RESERVED_SUBDOMAINS` likewise re-export the `@outfiqe/utils` originals so all three apps share
  one definition of a valid tenant subdomain — unit-tested via `extractSubdomain` in
  `crm-access.utils.test.ts`), and `buildOrganizationAdminUrl` (see "Non-obvious rationale" for why
  invite/ownership-transfer emails need it instead of the raw `env.ADMIN_URL`).
- `crm-access.service.ts` — business rules: invite target must already be an existing staff
  account, one pending invite per email, accept requires the invite's email to match the accepting
  account, the SUPERADMIN membership can't be edited via `updateMembership` (use ownership transfer
  instead — see Non-obvious rationale), one pending ownership-transfer request per organization at
  a time. Custom-role rules live here too — `createRole`/`updateRole`/`deleteRole`/
  `updateOrganization` (see the custom-role-builder bullet in Non-obvious rationale).
- `crm-access.middleware.ts` — `resolveTenant` (resolves the request's `Organization` by
  subdomain, stores it on `res.locals.crmOrganization`), `requirePermission(key)` (reads that
  resolved organization, stacked after `requireAuth` exactly like `#middlewares/require-role.js`),
  and `requirePlatformAccess` (the replacement for a flat `requireRole(UserRole.ADMIN)` on every
  non-CRM `apps/admin` route — see Non-obvious rationale). All three live here, not in
  `#middlewares/`, because they query this module's own repository/service — a shared middleware
  depending on a module would invert this codebase's module → shared dependency direction.
- `crm-access.controller.ts` / `crm-access.routes.ts` — routes mounted at `/api/crm` in `app.ts`.
  `GET /organization` also carries `activeImpersonation: { byName, since } | null` (from
  `platform-impersonation`'s `findActiveForOrganization`). Two impersonation-visibility sub-routes
  live here because they're tenant-scoped: `GET /organization/impersonation-log` (`audit:read`,
  delegates to `platformImpersonationService.tenantLog`) and
  `POST /organization/end-impersonation` (`org:update`, delegates to
  `platformImpersonationService.endAllForOrganization`) — the tenant's own kill switch for a
  support session touching its data.
- `crm-access.schemas.ts` — Zod request validation.
- `crm-access.integration.test.ts` — end-to-end through `testApp` + a real test database.

`apps/api/prisma/seed-crm.ts` seeds the permission catalog, the single Organization, the built-in
roles, the `platform:access` grant on the built-in Admin role, the first SUPERADMIN membership (on
whichever `User` holds `UserRole.ADMIN`), and a platform-org Membership for every other
membership-less `UserRole.ADMIN` account. Those platform-level steps are grouped into
`seedPlatformCrm`, which two entry points share: `seedCrmAccess` (invoked from `prisma/seed.ts`'s
`main()`) runs `seedPlatformCrm` plus the demo tenant organizations and their subscriptions;
`apps/api/prisma/bootstrap-platform-crm.ts` (`pnpm --filter @outfiqe/api db:bootstrap:crm`) runs
`seedPlatformCrm` alone — no demo data — for provisioning a real deployment whose admin account
was created (via `prisma/createAdmin.ts` or otherwise) after, or instead of, the full seed. The
prod deploy workflow (`.github/workflows/deploy.yml`) runs it on the droplet right after
`prisma migrate deploy`, so a deployment self-heals without a manual step. Everything here is
idempotent — safe to re-run.

## Funnel

**User-facing:** a staff member with `members:invite` sends a CRM invite to an email, picking a
role. If that email already has an Outfiqe staff account, they accept the invite from their own
already-logged-in admin session (`/crm/invites/accept`) — accepting is what grants them CRM access,
and nothing about their `apps/admin` login changes. If the email has no Outfiqe account, the invite
email instead links to a public `/crm/invites/register` page where they set a name and password;
submitting it creates the account and the tenant `Membership` together and signs them in — see the
"Invitees without an Outfiqe account" bullet under Non-obvious rationale.

**Technical:** `crm-access.routes.ts` → `resolveTenant` (resolves `Organization` by subdomain,
falls back to the single seeded org) → `requireAuth` (existing JWT session) → `requirePermission`
(resolves `Membership → Role → RolePermission` for that organization, SUPERADMIN short-circuits)
→ `crm-access.controller.ts` (reads the already-resolved organization via `getResolvedOrganization`
— no repeat query) → `crm-access.service.ts` → `crm-access.repository.ts` → Postgres.

## Non-obvious rationale

- **`Organization` carries denormalised CRM counters** (`contactCount`, `dealCount`,
  `ticketCount`, `activityCount`, `lastCrmActivityAt`). They exist so the platform metrics
  dashboard is a per-org point read instead of a cross-tenant `GROUP BY` over every CRM table.
  They are maintained inline by the `crm-*` write services and reconciled nightly; the true
  values can always be recomputed from the tenant's own rows by
  `prisma/backfill-crm-counters.ts` (`pnpm --filter @outfiqe/api db:backfill:crm-counters`),
  which is what the reconcile job runs.
- **SUPERADMIN is not a `Role` row.** It's `Organization.superAdminMembershipId`, a direct FK to
  one `Membership` — so it can't be edited down, duplicated, or granted through the invite flow
  (`OrganizationInvite.roleId` only ever points at a real `Role`). It's set once by the seed
  script or by `createOrganization`, and moved only through the ownership-transfer flow below.
- **Tenant resolution is subdomain-first, single-org-fallback, resolved once per request.**
  `resolveTenant` extracts a subdomain from `req.hostname` against `env.TENANT_BASE_DOMAIN`
  (`extractSubdomain` — rejects malformed labels and a reserved list: `www`, `api`, `admin`, `app`,
  `crm`, etc.). If a subdomain is present, the organization **must** match it exactly — an unknown
  subdomain is a `404`, never a silent fallback to the default org, since that would let a
  mistyped/malicious subdomain reach the wrong tenant's data. Only the _absence_ of a subdomain
  (today's only real traffic — `apps/admin` calls a single fixed API host) falls back to
  `findDefaultOrganization()`. The result is stored once on `res.locals.crmOrganization`
  (`getResolvedOrganization`), so `requirePermission` and every controller method read it instead
  of re-querying — the same "resolve once, read from `res.locals`" shape `requireAuth`/
  `res.locals.auth` already uses.
- **`apps/admin` calls the API same-origin (`apiClient`'s baseURL defaults to `/api`, not a fixed
  cross-origin host), so a request's `Host` header is genuinely whatever the browser navigated
  to.** That's what lets `resolveTenant` see a real org subdomain from actual browser traffic, not
  just curl/tests — the request reaches the API through whichever proxy is in front of the app
  (`apps/web`'s `next.config.ts` rewrites in the normal dev/deploy setup, `apps/admin`'s own
  `vite.config.ts` dev proxy when run standalone), both configured to forward the original Host,
  which Express already reads via `req.hostname` once `app.set("trust proxy", 1)` is set (already
  true — `app.ts`). `env.ADMIN_URL` (used to build the invite email link) follows the same rule:
  it has to be the proxied, browser-facing origin, not a raw backing-server port, or the person
  clicking the link lands on a different origin than the one they're already logged into.
- **Creating a second organization** (`POST /api/crm/organizations`) is deliberately not
  tenant-scoped — there's no `Membership` to check permissions against before the org exists — so
  it's gated on `requirePlatformAccess` instead, registered before
  `crmAccessRoutes.use(resolveTenant, ...)` so it never runs through tenant resolution at all. The
  creating account automatically becomes the new org's SUPERADMIN at creation time — matching how
  creating a workspace in Slack/Notion/Vercel makes you its owner, not a separate "assign yourself"
  step — but see the next bullet for what happens immediately after, when a target owner is given.
- **`createOrganization`'s optional `targetOwnerUserId` hands the new org off to a real business
  automatically, reusing ownership transfer rather than a second acceptance mechanism.** When
  provided (from `apps/admin`'s Organizations screen, which resolves it from an existing `Brand`'s
  owner via `suggestOrganizationFromBrand`), the creating staff member still becomes SUPERADMIN
  first as above, but the service then creates a Membership for the target in the org's built-in
  Admin role and immediately calls `createOwnershipTransfer` from the creator to that new
  membership with `removeSenderMembershipOnAccept: true` — the exact same accept/decline flow (and
  UI, and email) a manual "Transfer ownership" click already produces. The target only becomes
  SUPERADMIN once they accept, and the creating staff member is removed from the organization
  entirely at that point, since a platform staffer concierge-provisioning an org for an external
  business has no legitimate reason to remain a member afterward — unlike the manual transfer flow,
  where that's a real per-transfer choice (see the ownership-transfer bullet below), it's hardcoded
  here.
- **`Organization.linkedBrandId` is the anchor every tenant-scoped commerce query hangs off.**
  Nullable (the platform org and any org not yet tied to a commerce brand have none), `@unique`
  (one `Brand` backs at most one tenant `Organization`), `onDelete: SetNull` (deleting a brand
  doesn't cascade-delete a whole CRM tenant). It's set at provisioning time — the Organizations
  screen already makes the staffer pick a `Brand`, so `POST /api/crm/organizations` now persists
  that choice onto the created row via `createOrganization`'s `linkedBrandId`. A second org for a
  brand that already backs one is rejected as `BRAND_ALREADY_LINKED` (409) off the DB `@unique`
  itself — not a read-then-write pre-check — with the raw Prisma error kept server-side only;
  `uniqueConstraintTargetIncludes` (`shared/utils/prisma.utils.ts`) is what tells that violation
  apart from a `subdomain` collision, since Prisma 7's driver-adapter errors carry the offending
  columns under `meta.driverAdapterError.cause.constraint.fields`, not the legacy `meta.target`.
  `suggestOrganizationFromBrand` additionally returns `existingOrganizationForBrand` so the
  platform admin sees an already-onboarded brand before submitting — surfaced, not silently
  blocked, the same treatment `ownerExistingOrganizations` already gets.
- **`suggestOrganizationFromBrand` derives a subdomain suggestion, never a silent commitment.**
  `Brand` has no slug field, so the suggestion slugifies the brand's name and retries with a random
  suffix on collision — the same `slugifyHandle`/`withHandleSuffix` pair `user.repository.ts`
  already uses for `User.handle` collisions, reused rather than reinventing a second collision
  strategy. It also surfaces every organization the resolved owner already has
  (`findOrganizationsOwnedByUser`) so the platform admin can see, not just guess, whether they're
  about to onboard the same business a second time — allowed, since a real company can legitimately
  run more than one business, but never silent.
- **Tenant organizations must never reach Outfiqe's own commerce-admin sections** (Products,
  Orders, Brand applications, Commissions, Withdrawals, etc.). Once real tenant orgs exist with
  their own `UserRole.ADMIN` staff (e.g. a Meridian Apparel employee), gating every non-CRM
  `apps/admin` route on a flat `requireRole(UserRole.ADMIN)` — the same check CRM membership
  eligibility uses — would let that staff member see Outfiqe's own data. `requirePlatformAccess`
  fixes this as PBAC, not a hardcoded organization-id check: `Organization.isPlatformOrg` marks
  exactly one row (Outfiqe's own, set in `seed-crm.ts`) as the platform organization, and a new
  `platform:access` permission (its own catalog group, `"Platform"`) is deliberately **excluded**
  from `BUILT_IN_ROLE_PERMISSIONS` so no tenant org's Admin/Member role ever receives it
  automatically — it's granted only to Outfiqe's own built-in Admin role via a dedicated seed step,
  the same "special, not automatic" treatment `org:transfer_ownership` already gets.
  `requirePlatformAccess` resolves in order: not `UserRole.ADMIN` → `403`; an active `Membership`
  in the platform org that's either its SUPERADMIN or holds `platform:access` → **allow**; any
  other combination (including zero memberships anywhere, or a `Membership` only in a tenant org)
  → **deny**. `crm-access.service.ts`'s `resolveHasPlatformAccess` holds this resolution once,
  reused by both the middleware and `auth.service.ts`'s `getCurrentUser` (which exposes it to
  `apps/admin` as `hasPlatformAccess` on `/api/auth/me`, so `AdminSidebar` can hide non-CRM
  navigation for tenant-only staff).
- **Zero memberships anywhere denies platform access — it used to grandfather every such account
  as an implicit `allow`.** That grandfather clause was meant to cover admin accounts that predate
  the CRM system entirely, but it couldn't tell that apart from a brand-new tenant staff member who
  simply hadn't accepted a CRM invite yet — meaning any freshly-created `UserRole.ADMIN` account
  had full access to Outfiqe's real internal data (Products, Orders, Brand applications, etc.)
  until the moment they accepted an invite, if they ever did. Fixed as a deny-by-default default
  instead, with two companion changes so it doesn't regress real onboarding: `seed-crm.ts`'s
  `seedPlatformStaffMemberships` backfills every pre-existing zero-membership `UserRole.ADMIN`
  account with a real platform-org Membership (one-time, idempotent, must run after
  `seedDemoOrganizations` so tenant demo staff — who already have their own tenant membership by
  then — aren't wrongly swept in); and `auth.service.ts`'s `registerAdmin` (the ongoing path that
  creates brand-new platform staff accounts via the admin-invite flow) now grants a platform-org
  Membership atomically in the same transaction as the user create and invite-accept, via
  `crmAccessService.grantPlatformStaffMembership`, so every future legitimate hire is explicitly
  provisioned instead of implicitly trusted.
- **Inviting an existing `UserRole.ADMIN` account** takes the logged-in accept path: `acceptInvite`
  checks the accepting account's email matches the invite's email, so a valid token can't be
  redeemed by a different logged-in staff member than the one it was addressed to. An email that
  already belongs to a **non-staff** account (a storefront shopper/creator) is rejected outright
  (`409 EMAIL_IN_USE`) rather than silently privilege-escalated — linking a consumer login to a
  tenant is a deliberate future step, not an emailed-link side effect.
- **Invitees without an Outfiqe account register on accept, and get a tenant membership only.**
  `inviteMember` no longer requires the target to pre-exist — when `userRepository.findByEmail`
  finds nothing it still creates the `OrganizationInvite` and points the email at
  `/crm/invites/register` instead of `/crm/invites/accept`. That public page calls
  `GET /api/auth/invite/crm` (→ `crmAccessService.getInviteRegistrationInfo`) to show the org/role,
  then `POST /api/auth/register/crm-invite` (→ `auth.service.registerFromCrmInvite`) creates the
  `User` as `UserRole.ADMIN`, `emailVerified: true` (the invite email is proof of control), and the
  tenant `Membership` in one transaction via `crmAccessService.attachMembershipForInvite`, then
  issues the normal session. New tenant staff are `UserRole.ADMIN` with a **tenant-only** membership
  and **no platform-org membership**, so `resolveHasPlatformAccess` stays `false` and they never see
  Outfiqe's own admin — the same "Meridian Apparel employee" shape the platform-access bullet above
  describes. This is deliberately the existing identity model, not a new `UserRole` value; a
  dedicated tenant-staff role is a separate, larger schema decision. The endpoint is IP
  rate-limited (`registerIpRateLimit`) and gated by the single-use opaque invite token, matching
  `register/admin` and `register/brand`; a token whose email has since been claimed returns
  `409 USER_EXISTS`.
- **Custom-role builder: what a tenant can and can't do to its own roles.** `POST/PATCH/DELETE
/api/crm/roles` (gated `roles:manage`) let a tenant compose roles from any subset of
  `SELECTABLE_ROLE_PERMISSION_KEYS`. Four rules are enforced server-side, not just in the admin UI:
  a built-in role (`isBuiltIn`, the seeded Admin/Member) is never editable or deletable
  (`403 ROLE_IS_BUILT_IN`); a role that still has any `Membership` — active or deactivated — can't
  be deleted (`409 ROLE_IN_USE`, pre-checked via `countMembershipsForRole` and again caught off the
  `Membership.role` FK `Restrict` for the concurrent-write race); `platform:access` and
  `org:transfer_ownership` (and any key not in the catalog at all) are rejected on create/update
  (`400 INVALID_PERMISSION_KEYS` via `findUnselectablePermissionKeys`), the same "special, not
  automatic" treatment those two keys already get in `BUILT_IN_ROLE_PERMISSIONS`; a duplicate name
  is a `409 ROLE_NAME_TAKEN` off the `@@unique([organizationId, name])` constraint, not a
  read-then-write pre-check, with the raw Prisma error kept server-side. `updateRole` replaces the
  whole `RolePermission` set in one transaction (delete-all + `createMany`) rather than diffing.
  `PATCH /api/crm/organization` (gated `org:update`) renames the organization — the one org-settings
  write a tenant has. `findOrganizationByLinkedBrandId` and the `linkedBrand` name join on
  `listOrganizations` remain the only Step-0 additions.
- **`listOrganizations` is scoped `isPlatformOrg: false`** (`TENANT_ORGANIZATION_SCOPE` from
  `#constants/organization.constants`, shared with `platform-metrics`). The platform org is an
  `Organization` row too but not a tenant, so the admin "Organizations" screen — which manages CRM
  tenants — must not list it. `platform-metrics` applies the same constant to every tenant query.
- **Ownership transfer requires the recipient's acceptance — it's never an immediate, unilateral
  handoff.** Every other membership-changing action in this module already works this way (CRM
  invites, admin invites both require an explicit accept step), so this follows the same shape
  rather than inventing a new one: the SUPERADMIN creates an `OwnershipTransferRequest` targeting
  an existing active `Membership` in the same organization, the target user accepts or declines it
  themselves, and only acceptance actually moves `superAdminMembershipId`. Only one pending request
  per organization at a time (`findPendingOwnershipTransfer`, the same "check for an existing
  pending thing" shape as `findPendingInviteByEmail`). `declinedAt` is a separate column from
  `revokedAt` even though both just mean "no longer actionable," because two different people can
  end a pending request from two different sides (recipient declines vs. sender/SUPERADMIN
  cancels) — worth distinguishing in the data.
- **Whether the sender keeps their own membership after a transfer is an explicit choice made at
  request time, not a system-decided default** (`removeSenderMembershipOnAccept`, set from
  `createOwnershipTransfer`'s `removeSenderMembership` argument, unchecked by default in
  `apps/admin`'s modal). The system can't tell apart a support/concierge account handing an org
  back to its real owner (who should lose access entirely) from a real business owner handing off
  to a co-founder (who should very much stay a member) — both look identical as `Membership A
transfers to Membership B`. Rather than guessing, the person initiating the transfer decides,
  the same way GitHub asks "remain a collaborator?" when transferring a repository. When set,
  `acceptOwnershipTransfer` deletes the `fromMembership` row in the same transaction that moves
  `superAdminMembershipId` — which also cascades away any of that membership's own historical
  `OwnershipTransferRequest` rows via the existing `onDelete: Cascade` on `fromMembershipId`, since
  they're no longer meaningful once the membership itself is gone.
- **Only the current SUPERADMIN can initiate a transfer, and this falls out of the existing
  permission model for free.** `org:transfer_ownership` is deliberately in
  `SUPERADMIN_ONLY_PERMISSION_KEYS` (excluded from every role's default permission set, granted to
  nobody), so `requirePermission("org:transfer_ownership")` only ever passes through the
  SUPERADMIN bypass already built into `requirePermission` — no separate "is this the SUPERADMIN"
  check needed on the route. `crm-access.service.ts`'s `createOwnershipTransfer` still validates
  `organization.superAdminMembershipId === fromMembershipId` directly as defense in depth, the
  same reasoning `updateMembership`'s SUPERADMIN-lock check already uses.
- **This is deliberately still a single-SUPERADMIN model** — `superAdminMembershipId` stays one FK,
  moved by transfer, not a set of equal-rank "Owners." Multiple owners (matching how Slack/GitHub
  reduce the single-point-of-failure risk of one irreplaceable account) is a bigger, separate
  schema decision, not folded into this.
- **`TENANT_BASE_DOMAIN` is `outfiqe.local` in local dev, never bare `localhost`.** The session
  cookie (`shared/utils/cookie.utils.ts`) is set with `domain: env.TENANT_BASE_DOMAIN` so one login
  is shared across every tenant subdomain — the same mechanism a real deployment on `outfiqe.com`
  needs to make `daraz.outfiqe.com` and `meridian.outfiqe.com` share a session without
  re-authenticating. Browsers (and curl) refuse to honor a `Domain=` cookie on a single-label host
  like `localhost` — it has no dots, so it's treated like a public suffix and subdomain
  cookie-sharing is blocked outright (the same supercookie-prevention rule that stops a cookie
  being scoped to bare `com`). A real domain (`outfiqe.com`) is inherently multi-label so it never
  hits this in production; locally it means `localhost` genuinely cannot carry a session across
  subdomains — not just for CRM tenant testing, for every login. See the root `README.md`'s "Local
  domain setup" for the required env values and hosts-file entries.
- **`apps/api/.env.test` pins its own `TENANT_BASE_DOMAIN=localhost`, rather than inheriting
  whatever the developer's own `apps/api/.env` says.** The integration test fixtures use
  `*.localhost` Host headers throughout (`crm-access.integration.test.ts`'s "Tenant resolution via
  subdomain" suite), and the env loader falls back to `.env` for anything `.env.test` doesn't set —
  so once local dev permanently switched to `TENANT_BASE_DOMAIN=outfiqe.local` (see the bullet
  above), those tests silently started resolving the wrong organization. Tests must not depend on
  a developer's personal dev-domain choice; `.env.test`/`.env.test.example` pin it explicitly so
  the suite behaves the same on every machine regardless of local `.env` customization.
- **`acceptInvite`'s transaction retries on a real Postgres deadlock instead of failing the
  request.** `acceptInviteWithClient` inserts a `Membership` row referencing the invite's
  `organizationId`/`roleId`, then updates the `OrganizationInvite` row — two concurrent accepts
  into the _same_ organization (two different invitees, or a retried client request) both take a
  row lock on that shared `Organization`/`Role` parent for the FK check, which Postgres can
  legitimately resolve as a deadlock (`40P01`) rather than blocking forever. Prisma 7's
  driver-adapter path doesn't surface that as the documented `P2034` write-conflict code — it wraps
  it as a generic `P2039` with the raw SQLSTATE inside `meta.driverAdapterError.cause.originalCode`
  — so `isDeadlockError`/`runWithDeadlockRetry` (`shared/utils/prisma.utils.ts`) check that raw code
  directly rather than trusting `P2034` alone. Retrying is the standard, correct response to this
  class of error (the loser transaction did nothing wrong; it just lost a race), not a workaround
  for a bug in this function's own logic. Each attempt — including the first — checks
  `findMembershipByUserAndOrg` before touching the transaction, so a retry after a deadlock (or any
  other reason the caller re-invokes `acceptInvite` for the same invite/user) finds the
  already-granted membership and returns it instead of trying to insert a duplicate; a deadlock
  rollback is always full, never partial, but this makes the operation idempotent on its own terms
  rather than relying on that guarantee alone.
