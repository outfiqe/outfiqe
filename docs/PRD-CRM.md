# Outfiqe Internal CRM — PRD

Internal reference doc, committed to the repo. Full behavioral spec of the internal CRM: the
target 11-chunk architecture, and a complete spec of Chunks 1–2 — tenant/PBAC foundation schema
and CRM access on the existing admin auth — designed and built this session. Branch:
`feat/crm-tenant-pbac-foundation`. `TESTING-CRM.md` (also committed) is the API-level test pass
derived from this.

---

## 1. Goal

Give Outfiqe's own staff (Sales/Support/Ops) a relationship-management tool for the business's
real creators, brands, and shoppers — pipeline/deals, notes/calls, support tickets — without
standing up a second product, a second login, or a second frontend app. This is **not** a
sellable, multi-tenant SaaS CRM: there is exactly one `Organization` row, seeded for Outfiqe
itself, no public signup, and it ships as a new feature area inside `apps/admin`, the same tool
staff already use to manage creators, brands, and orders. The multi-tenant/PBAC schema is still
built properly underneath — every table scoped by `organizationId`, every action gated by a
permission — so it stays reopenable to outside companies later without a rearchitecture, even
though nothing in this build is meant to be sold.

Chunks 1–2 ship the one piece that has to exist before any of the rest is safe to build on: a
tenant/permission schema and a way to grant an existing staff account CRM access, enforced
server-side, that every later chunk's routes call into rather than re-derive.

## 2. Architecture decision (applies to every chunk)

| Concern        | Decision                                                                                                                     | Why                                                                                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend home  | `apps/admin/src/features/crm` (Chunk 4+) — **not** a new `apps/crm` app                                                      | CRM's only users are Outfiqe staff, the same audience already using `apps/admin`; reuses `AppShell`/`AdminSidebar`/`AccountMenu`/staff auth instead of duplicating them |
| Backend home   | New modules in `apps/api` (`crm-access` this chunk; `crm-partners`, `crm-deals`, … later)                                    | Not a separate service — revisit only if scaling or deploy cadence genuinely demand it                                                                                  |
| Session        | The existing `apps/admin` staff JWT session, no second login                                                                 | There's no outside company to self-serve signup; CRM access is a permission layer on top of an existing account, not a new account type                                 |
| Tenancy        | Shared Postgres DB, one seeded `Organization` row, every CRM table carries `organizationId`                                  | Keeps the schema honest and reopenable later even with exactly one tenant today                                                                                         |
| Access control | Full PBAC (permission catalog, roles, custom roles later) — not the flat `UserRole` + `requireRole()` pattern used elsewhere | Sales/Support/Ops need genuinely different access to creator/brand data; a flat role can't express that                                                                 |
| Data model     | Relationship layer over existing `Creator`/`Brand`/`User` records, not a duplicate profile model (Chunk 5+)                  | This repo's own rule: link/query live, don't duplicate                                                                                                                  |
| Billing        | eSewa/Khalti via the existing `payments` module (Chunk 3), not Stripe                                                        | Outfiqe already has both gateways integrated; neither has a native subscription object, so renewal is tracked in-house on a scheduler                                   |

## 3. Actors

| Actor                                  | Surface                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------- |
| Outfiqe staff with no CRM `Membership` | Existing `apps/admin` login works as always; every `/api/crm/*` route returns `403` (Chunk 2) |
| Outfiqe staff with a CRM `Membership`  | Same login; `/api/crm/*` routes gated per-permission (§6)                                     |
| SUPERADMIN                             | One per `Organization`, implicit allow-all, seeded once — not an invitable role (§6)          |
| Outside companies / public signups     | None. Not in scope for this build (§10)                                                       |

## 4. Chunk 1–2 — In scope (built this session)

- **Chunk 1 — Tenant + PBAC foundation schema.** `Organization`, `Membership`, `Role`,
  `Permission`, `RolePermission`, `OrganizationInvite` — a purely additive Prisma migration,
  nothing existing touched. A seed script (`prisma/seed-crm.ts`) creates the permission catalog,
  the single Outfiqe `Organization`, the built-in `Admin`/`Member` roles, and the first
  SUPERADMIN `Membership` (idempotent — safe to re-run).
- **Chunk 2 — CRM access on existing admin auth.** `requirePermission(key)` middleware
  (`crm-access.middleware.ts`), stacked after `requireAuth` exactly like `requireRole` — no new
  signup/login flow. Invite an existing staff account into a CRM role by email
  (`POST /api/crm/invites`), accept it on their own session (`POST /api/crm/invites/accept`),
  list/update members, list roles/permissions/the organization.

## 5. Explicitly out of scope (Chunks 1–2 — not oversights)

- Any `apps/admin` UI — Chunk 4. Everything in Chunks 1–2 is API-only; `TESTING-CRM.md` is
  therefore a curl-level test pass, not a UI walkthrough.
- Billing/`Subscription`, eSewa/Khalti checkout — Chunk 3.
- `Partner`/`Customer`/`Deal`/`Ticket`/`Activity`/`Task` — Chunks 5–8. Chunk 1's schema stops at
  the tenant/PBAC tables listed in §4.
- Custom-role builder, org settings UI, ownership transfer (`org:transfer_ownership` is in the
  permission catalog and reserved, but no endpoint exists yet to exercise it) — Chunk 9.
- Search, reporting/dashboards — Chunk 10.
- Opening the product to external companies — the schema stays capable of it; not the current
  goal (§2).

## 6. Data model

```
Organization
  id, name, plan (default "trial"), trialEndsAt
  superAdminMembershipId   uuid? @unique -> Membership   // set post-creation, not at insert time

Membership
  id, userId -> User, organizationId -> Organization, roleId -> Role
  status   ACTIVE | DEACTIVATED
  // @@unique([userId, organizationId])

Role
  id, organizationId -> Organization, name, isBuiltIn
  // @@unique([organizationId, name])

Permission
  key    String @id   // e.g. "deals:write"
  label, group

RolePermission
  roleId -> Role, permissionKey -> Permission   // @@id([roleId, permissionKey])

OrganizationInvite
  id, organizationId -> Organization, email, roleId -> Role
  tokenHash, expiresAt, acceptedAt?, revokedAt?, invitedById -> User
```

**Permission catalog** (seeded once, shared across all orgs): `org:read`, `org:update`,
`org:transfer_ownership` (reserved, SUPERADMIN-only) · `roles:read`, `roles:manage` ·
`members:read`, `members:invite`, `members:manage` · `billing:read`, `billing:manage` ·
`accounts:read`, `accounts:write`, `accounts:delete` · `customers:read`, `customers:write` ·
`contacts:read`, `contacts:write`, `contacts:delete` · `pipeline:read`, `pipeline:configure` ·
`deals:read`, `deals:write`, `deals:delete` · `tickets:read`, `tickets:write`, `tickets:manage` ·
`activities:read`, `activities:write` · `tasks:read`, `tasks:write` · `reports:read`.

**Built-in roles:** `Admin` gets every permission except `org:transfer_ownership`; `Member` gets
read/write on the operational permissions (partners/customers/contacts/pipeline/deals/tickets/
activities/tasks/reports) but not org/roles/members/billing management.

## 7. Complete flow

1. **Seeding** (`prisma/seed-crm.ts`, run via `pnpm db:seed`) — idempotent: inserts the
   permission catalog, creates the one `Organization` if none exists, creates the built-in roles
   if missing, and — only if `Organization.superAdminMembershipId` is still null — picks the
   first `User` with `UserRole.ADMIN`, gives them an `Admin`-role `Membership`, and points
   `superAdminMembershipId` at it. If no `ADMIN` user exists yet, this step logs a warning and
   skips rather than failing the whole seed run.
2. **Requesting a protected route** — every `/api/crm/*` route (except
   `GET /permissions` and `POST /invites/accept`, which only need `requireAuth`) runs
   `requirePermission(key)`. It resolves the caller's `userId` → `Membership` in the single
   seeded `Organization`, rejects (`403`) if no `ACTIVE` membership exists, short-circuits to
   allow if the membership **is** the org's `superAdminMembershipId`, otherwise checks the
   membership's `Role`'s permission set for `key`.
3. **Inviting** — `POST /api/crm/invites { email, roleId }`, gated on `members:invite`. Rejects
   if `roleId` doesn't belong to this org (`404`), if `email` doesn't match an existing staff
   `User` (`404` `STAFF_ACCOUNT_NOT_FOUND` — no CRM signup), if that user already has a
   `Membership` (`409`), or if a pending invite for that email already exists (`409`). Otherwise
   generates an opaque token (`generateOpaqueToken`/`hashToken`, same pattern as
   `admin-invites`), stores only the hash, and emails the invitee a link into
   `${ADMIN_URL}/crm/invites/accept?token=...` (7-day TTL).
4. **Accepting** — `POST /api/crm/invites/accept { token }`, `requireAuth` only (any existing
   staff session). Rejects an unknown/expired/revoked/already-accepted token (`404`/`409`), or
   one whose `email` doesn't match the accepting account's own email (`403`
   `INVITE_EMAIL_MISMATCH` — a valid token can't be redeemed by a different logged-in staff
   member than the one it was addressed to). On success, creates the `Membership` and marks the
   invite accepted in one transaction.
5. **Managing members** — `GET /api/crm/members` (`members:read`) lists everyone with access,
   their role, and whether they're the SUPERADMIN. `PATCH /api/crm/members/:membershipId`
   (`members:manage`) changes role/status but refuses to target the SUPERADMIN membership
   (`403` `SUPERADMIN_MEMBERSHIP_LOCKED` — that's only ever moved via the not-yet-built Chunk 9
   ownership-transfer action).

## 8. Business rules locked this session

| Decision                                                                  | Answer                                                                                                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Is SUPERADMIN a `Role` row?                                               | **No.** It's `Organization.superAdminMembershipId`, a direct FK to one `Membership` — can't be edited down, duplicated, or invited into. |
| Can CRM access be granted to someone with no existing admin account?      | **No.** `inviteMember` requires an existing `UserRole.ADMIN` account; there is no CRM-specific signup.                                   |
| Can a valid invite token be accepted by a different logged-in account?    | **No.** The accepting account's email must match the invite's target email.                                                              |
| Can `members:manage` edit the SUPERADMIN's role/status?                   | **No.** Blocked with a dedicated error; only ownership transfer (Chunk 9, not built) moves SUPERADMIN.                                   |
| Does `requirePermission` read the JWT's flat `role` claim?                | **No.** It ignores `UserRole` entirely and resolves CRM permissions from `Membership → Role → RolePermission` in the DB.                 |
| Where does `requirePermission` live — `shared/middlewares` or the module? | **The module** (`crm-access.middleware.ts`) — it depends on the CRM repository, and `shared/` must never depend on a module (see §9).    |

## 9. Non-obvious rationale

**`requirePermission` lives in `crm-access.middleware.ts`, not `shared/middlewares/`.** Every
existing shared middleware (`require-auth.ts`, `require-role.ts`) is module-agnostic — no
dependency on any `#modules/*` code. `requirePermission` genuinely needs the CRM repository to
resolve a membership's permission set, so putting it in `shared/` would invert this codebase's
module → shared dependency direction. It's still designed as a drop-in sibling to `requireRole`
(same signature shape, same `requireAuth`-then-this stacking) — just owned by the module that
actually has the data it depends on. Any future CRM module (`crm-partners`, `crm-deals`, …) is
expected to import it from here.

**One repository round-trip per protected request, not a JWT claim.** Embedding the resolved
permission set into the access token would mean a token minted before a role change stays valid
with stale permissions until it expires. With exactly one `Organization` today, the extra
`getOrganization` + `findMembershipByUserAndOrg` lookup is cheap; if a future multi-org chunk
needs to resolve _which_ org a request belongs to, that's the one place that changes.

**`crm-access.repository.ts` only exposes what Chunks 1–2 need.** Org update, role
create/edit/delete, and ownership transfer are deliberately absent — they belong to later chunks
(org settings UI, custom-role builder, ownership transfer) and would be unused, unscoped surface
area if added now.

**Why the seed script skips silently instead of failing when no `ADMIN` user exists yet.**
Matches the existing precedent in `prisma/seed.ts` (`seedWithdrawPolicies`,
`seedPlatformCommissionRule`) — a fresh/partial database shouldn't hard-fail the entire seed run
over one downstream step; the CRM SUPERADMIN seed step is retried for free on the next `db:seed`
run once an `ADMIN` user exists.

## 10. Security & compliance

Same ASVS-aligned bar the rest of this codebase holds itself to (`CLAUDE.md` "Security" section):

- Every `/api/crm/*` route requires `requireAuth`; permission checks happen server-side in
  `requirePermission`, never trusting a client-supplied role or membership id.
- `POST /api/crm/invites` is rate-limited (`rateLimit()`, keyed on the caller's user id) — the
  same public-write-endpoint standard every other mutation in this codebase holds itself to.
- Invite tokens are opaque, cryptographically random, single-use (`acceptedAt` set on accept),
  revocable (`revokedAt`), and short-TTL (7 days) — only the hash is ever persisted, matching
  `admin-invites`' existing pattern.
- No information leak beyond what's necessary: an invite to an email with no matching staff
  account fails fast (`404 STAFF_ACCOUNT_NOT_FOUND`) rather than silently no-op'ing, since (unlike
  login) this is an authenticated, permissioned action — the caller already had to prove
  `members:invite` to reach it.
- No new PII surface — `Membership`/`OrganizationInvite` store ids, a role, and status/timestamp
  fields; no profile data is duplicated onto them (§2).

## 11. Resilience & edge cases

- **No `Organization` row yet** (schema migrated but seed never run) — `requirePermission` and
  every service method that needs it fail closed (`403`/`404`), never a raw DB error.
- **A staff account with no `Membership`** — `403`, same as an explicitly denied permission; no
  distinction is made between "never invited" and "invited but revoked."
- **A `DEACTIVATED` membership** — treated as no access, same as having none, without deleting
  the row (preserves history for Chunk 9's audit logging).
- **Re-running the seed script** — every step is upsert/existence-checked; a second run produces
  no duplicate `Permission`/`Role`/`Membership` rows and doesn't move an already-set
  `superAdminMembershipId`.
- **Inviting someone who already has access, or who already has a pending invite** — both
  rejected (`409`) rather than silently creating a duplicate.

## 12. Chunk plan

Built chunk-by-chunk, on `feat/crm-tenant-pbac-foundation`:

1. **Tenant + PBAC foundation schema** — built this session. Migration
   `20260825070957_add_crm_tenant_pbac_foundation`, `crm-access.types.ts`/`.constants.ts`/
   `.repository.ts`, `prisma/seed-crm.ts` wired into `prisma/seed.ts`.
2. **CRM access on existing admin auth** — built this session. `crm-access.middleware.ts`,
   `.service.ts`, `.controller.ts`, `.routes.ts`, `.schemas.ts`, mounted at `/api/crm`, a 9-case
   integration suite (`crm-access.integration.test.ts`), module `README.md`, this doc,
   `TESTING-CRM.md`.

**Forward-looking (not built, not scheduled yet):**

3. Subscriptions & billing — eSewa/Khalti via the existing `payments` module, per-seat tiers,
   14-day no-card trial, gates advanced features, scheduled renewal job.
4. `apps/admin` CRM feature area — first UI, `apps/admin/src/features/crm`.
5. Partners & Customers — relationship layer over existing `Creator`/`Brand`/shopper `User`
   records.
6. Pipeline & Deals — configurable stages, Kanban board primitive in `packages/design-system`.
7. Interaction timeline & tasks — logged note/call/message/email, merged at query time with live
   `orders`/`payments` history.
8. Support & ticketing.
9. Team management — custom-role builder UI, ownership transfer.
10. Search, filters, basic reporting.
11. Hardening — audit logging, full empty/error-state pass.

**How to apply Chunk 3+:** read §12 above for scope per chunk; call `requirePermission` from
every new CRM route rather than re-deriving access logic, and extend
`crm-access.constants.ts`'s `PERMISSION_CATALOG`/`BUILT_IN_ROLE_PERMISSIONS` rather than
hardcoding new permission checks inline.
