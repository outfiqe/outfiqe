# CRM Access

## Purpose

Foundation module for Outfiqe's internal CRM: the tenant/PBAC schema (`Organization`,
`Membership`, `Role`, `Permission`, `RolePermission`, `OrganizationInvite`) and the access layer
that grants existing `apps/admin` staff accounts CRM permissions — no second login, no public
signup. There is exactly one `Organization` row today, seeded for Outfiqe itself, but tenant
resolution is genuinely multi-tenant-capable — every request is resolved to an organization by
subdomain (with a single-org fallback), not by grabbing whichever row exists first. Nothing here
is built to sell the product externally (no public signup, no per-org frontend) — the resolution
mechanism is just built correctly from day one so a second organization doesn't require a
rearchitecture. The full 11-chunk roadmap (billing, Partners/Customers, pipeline & deals,
support/ticketing, custom-role builder, ownership transfer, reporting) isn't checked into this
repo as a doc yet — this module covers Chunks 1–2 (tenant/PBAC schema + access on existing admin
auth); the first `apps/admin` CRM screen (Chunk 4, `apps/admin/src/features/crm`) is built too.

## Structure

- `crm-access.types.ts` — record/summary/input types for every entity this module owns.
- `crm-access.constants.ts` — `PERMISSION_CATALOG` (the full permission key catalog, grouped) and
  `BUILT_IN_ROLE_PERMISSIONS` (the Admin/Member built-in role presets derived from it).
- `crm-access.repository.ts` — Prisma queries, every one scoped by `organizationId` where
  applicable. `acceptInvite` wraps the Membership-create + invite-accept pair in a transaction.
- `crm-access.utils.ts` — pure mappers: `toMembershipSummary`, `toInviteSummary` (derives
  PENDING/ACCEPTED/REVOKED/EXPIRED from an invite's timestamps, the same shape as
  `admin-invites/adminInvite.utils.ts`'s `toSummary`) and `extractSubdomain(host, baseDomain)`
  (pure hostname parsing, unit-tested in `crm-access.utils.test.ts`).
- `crm-access.service.ts` — business rules: invite target must already be an existing staff
  account, one pending invite per email, accept requires the invite's email to match the accepting
  account, the SUPERADMIN membership can't be edited via `updateMembership`.
- `crm-access.middleware.ts` — `resolveTenant` (resolves the request's `Organization` by
  subdomain, stores it on `res.locals.crmOrganization`), `requirePermission(key)` (reads that
  resolved organization, stacked after `requireAuth` exactly like `#middlewares/require-role.js`),
  and `requirePlatformAccess` (the replacement for a flat `requireRole(UserRole.ADMIN)` on every
  non-CRM `apps/admin` route — see Non-obvious rationale). All three live here, not in
  `#middlewares/`, because they query this module's own repository/service — a shared middleware
  depending on a module would invert this codebase's module → shared dependency direction.
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

**Technical:** `crm-access.routes.ts` → `resolveTenant` (resolves `Organization` by subdomain,
falls back to the single seeded org) → `requireAuth` (existing JWT session) → `requirePermission`
(resolves `Membership → Role → RolePermission` for that organization, SUPERADMIN short-circuits)
→ `crm-access.controller.ts` (reads the already-resolved organization via `getResolvedOrganization`
— no repeat query) → `crm-access.service.ts` → `crm-access.repository.ts` → Postgres.

## Non-obvious rationale

- **SUPERADMIN is not a `Role` row.** It's `Organization.superAdminMembershipId`, a direct FK to
  one `Membership` — so it can't be edited down, duplicated, or granted through the invite flow
  (`OrganizationInvite.roleId` only ever points at a real `Role`). It's set once by the seed
  script; moving it is a Chunk 9 "transfer ownership" action, not built yet.
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
  creating account automatically becomes the new org's SUPERADMIN — matching how creating a
  workspace in Slack/Notion/Vercel makes you its owner, not a separate "assign yourself" step.
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
  `requirePlatformAccess` resolves in order: not `UserRole.ADMIN` → `403`; no `Membership` row
  anywhere for this user → **allow** (grandfathers every admin account that predates the CRM
  system entirely, zero regression); an active `Membership` in the platform org that's either its
  SUPERADMIN or holds `platform:access` → **allow**; any other combination (including a
  `Membership` only in a tenant org) → **deny**. `crm-access.service.ts`'s
  `resolveHasPlatformAccess` holds this resolution once, reused by both the middleware and
  `auth.service.ts`'s `getCurrentUser` (which exposes it to `apps/admin` as `hasPlatformAccess` on
  `/api/auth/me`, so `AdminSidebar` can hide non-CRM navigation for tenant-only staff).
- **Inviting requires an existing `UserRole.ADMIN` account** (`userRepository.findByEmail`, then a
  role check) — there is no CRM signup. `acceptInvite` additionally checks the accepting account's
  email matches the invite's email, so a valid token can't be redeemed by a different logged-in
  staff member than the one it was addressed to.
- **`crm-access.repository.ts` only exposes what Chunks 1–2 need.** `updateOrganization`,
  role create/update/delete, and ownership transfer are deliberately not here yet — they belong to
  later chunks (custom-role builder, org settings UI, ownership transfer) and would be unused,
  unscoped code if added now.
- **`TENANT_BASE_DOMAIN` can't be `localhost` if you actually want to browser-test subdomain
  switching.** The session cookie (`shared/utils/cookie.utils.ts`) is set with
  `domain: env.TENANT_BASE_DOMAIN` so one login is shared across every tenant subdomain — the same
  mechanism a real deployment on `outfiqe.com` needs to make `daraz.outfiqe.com` and
  `meridian.outfiqe.com` share a session without re-authenticating. Browsers (and curl) refuse to
  honor a `Domain=` cookie on a single-label host like `localhost` — it has no dots, so it's
  treated like a public suffix and subdomain cookie-sharing is blocked outright (the same
  supercookie-prevention rule that stops a cookie being scoped to bare `com`). A real domain
  (`outfiqe.com`) is inherently multi-label so it never hits this in production; locally it means
  `localhost` genuinely cannot exercise cross-subdomain login. To actually test it:
  1. Set `TENANT_BASE_DOMAIN=outfiqe.local` in `apps/api/.env` (any multi-label host works —
     `outfiqe.local`/`.test` are the conventional reserved-for-testing choices) and restart the API
     process (env vars are read once at boot, `tsx watch` does not reload `.env` on its own).
  2. Add loopback entries to the hosts file (`C:\Windows\System32\drivers\etc\hosts` on Windows,
     needs an elevated/administrator editor to save; `/etc/hosts` on macOS/Linux) for the base
     domain and every org subdomain you want to reach, e.g. `127.0.0.1 outfiqe.local`,
     `127.0.0.1 daraz.outfiqe.local`.
  3. Log in via the base domain (`http://outfiqe.local:3000`) and navigate to a tenant subdomain
     (`http://daraz.outfiqe.local:3000/admin/crm`) — the session now carries over.
