# Outfiqe Internal CRM — Test Plan

Covers Chunks 1–2 (tenant/PBAC foundation schema, CRM access on existing admin auth) on branch
`feat/crm-tenant-pbac-foundation`. There is **no UI yet** — Chunk 4 builds the first `apps/admin`
CRM screen — so every funnel below is an API-level pass against `/api/crm/*` directly. Organized
as funnels, matching [TESTING-CHAT.md](./TESTING-CHAT.md)'s format.

## 1. Test accounts and setup you'll need

| Role                       | How to get one                                                                                                                                              | Notes                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Any existing staff account | Seeded via `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD` in `apps/api/.env`, or `POST /api/auth/register/admin` if your build has that path open       | Needed for every funnel below — CRM access always sits on top of an existing admin login                                 |
| The seeded CRM SUPERADMIN  | Run `pnpm --filter @outfiqe/api db:seed` — it grants the first `UserRole.ADMIN` account it finds a SUPERADMIN `Membership` in the one seeded `Organization` | If you bootstrap your admin account _after_ the first seed run, re-run `db:seed` — it's idempotent and will pick them up |
| A second staff account     | Any other `UserRole.ADMIN` account (register one, or promote a seeded user's role directly in the DB for local testing)                                     | The "invitee" for the invite/accept funnels — must already exist, since there's no CRM signup                            |

**Before any funnel below:** run migrations and seed against your target DB —

```bash
pnpm --filter @outfiqe/api db:migrate   # applies 20260825070957_add_crm_tenant_pbac_foundation
pnpm --filter @outfiqe/api db:seed      # idempotent — safe to re-run
```

Get a bearer token for any staff account via the existing login endpoint:

```bash
curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<email>","password":"<password>"}' | jq -r .data.accessToken
```

Every request below assumes `-H "Authorization: Bearer $TOKEN"` with that token.

---

## 2. Funnel: Permission gating with no CRM membership

- [ ] As a staff account that has **never** been granted CRM access, `GET /api/crm/organization`
      — confirm `403`, not a `500` or a silent empty response.
- [ ] Same account, `GET /api/crm/roles`, `GET /api/crm/members`, `GET /api/crm/invites` — confirm
      all `403`.
- [ ] Same account, `GET /api/crm/permissions` — confirm `200` (this one only needs
      `requireAuth`, not a specific permission — it's the static catalog, safe for any staff
      account to read).
- [ ] The same requests **without** an `Authorization` header at all — confirm `401`, not `403`
      (auth failure vs. permission failure are distinct).

## 3. Funnel: The seeded SUPERADMIN

- [ ] As the account `db:seed` granted SUPERADMIN to, `GET /api/crm/organization` — confirm `200`
      and the returned `id` matches the one row in the `organizations` table.
- [ ] Same account, `GET /api/crm/members` — confirm it appears in the list with its role and
      `isSuperAdmin: true` (or equivalent field per the current `MembershipSummary` shape).
- [ ] `PATCH /api/crm/members/:membershipId` targeting the SUPERADMIN's own membership id (any
      body) — confirm `403 SUPERADMIN_MEMBERSHIP_LOCKED`, not a silent success. This is
      intentional: SUPERADMIN only moves via the not-yet-built ownership-transfer action
      (Chunk 9).
- [ ] Re-run `pnpm db:seed` after the above — confirm the organization row, role rows, and
      SUPERADMIN membership are unchanged (no duplicates, `superAdminMembershipId` unchanged).

## 4. Funnel: Inviting an existing staff account

- [ ] As the SUPERADMIN (or any account with `members:invite`), `GET /api/crm/roles` — note the
      `Member` role's `id`.
- [ ] `POST /api/crm/invites { "email": "<second staff account's email>", "roleId": "<Member
role id>" }` — confirm `201`.
- [ ] Repeat the exact same request immediately — confirm `409 INVITE_ALREADY_PENDING`, not a
      second invite row.
- [ ] `POST /api/crm/invites` targeting an email that **isn't** an existing staff account (e.g.
      a fresh, never-registered address) — confirm `404 STAFF_ACCOUNT_NOT_FOUND`. This is the
      "no CRM signup" rule — invites can only target someone who can already log into
      `apps/admin`.
- [ ] `POST /api/crm/invites` targeting someone who already holds a CRM `Membership` — confirm
      `409 MEMBER_EXISTS`.
- [ ] `POST /api/crm/invites` with a `roleId` that doesn't belong to this organization (e.g. a
      random UUID) — confirm `404 ROLE_NOT_FOUND`.
- [ ] As a staff account **without** `members:invite` (e.g. a plain `Member`), attempt
      `POST /api/crm/invites` — confirm `403`.
- [ ] `GET /api/crm/invites` as the inviter — confirm the pending invite appears with `status:
"PENDING"` and the correct `roleName`.
- [ ] Rapidly repeat `POST /api/crm/invites` well beyond the configured rate-limit window/max
      (`CRM_INVITE_RATE_LIMIT_MAX_REQUESTS` in `crm-access.routes.ts`) — confirm it eventually
      comes back `429` with a `Retry-After` header.

## 5. Funnel: Accepting an invite

Since the invite email only logs to console/stub in local dev (no `GMAIL_APP_PASSWORD`
configured), read the raw token from the server log line (`[email] ... to=<email> ...`) or, for a
fully scripted pass, from the DB directly — note the flow only ever stores `tokenHash`, so you
need the raw token from the point it was generated, not reconstructed after the fact.

- [ ] As the invited account (the one the email/log's link was addressed to),
      `POST /api/crm/invites/accept { "token": "<raw token>" }` — confirm `201` and a
      `Membership` now exists for that account in the organization, with the invited role.
- [ ] Repeat the same accept request with the same token — confirm `409` (`acceptedAt` is now
      set; not a second membership).
- [ ] As a **different** staff account than the one the invite was addressed to, attempt to
      accept the same (unused) token — confirm `403 INVITE_EMAIL_MISMATCH`, not a success. Use a
      fresh invite for this check, since the first one above is already consumed.
- [ ] Manually expire an invite (or wait past its 7-day TTL in a test environment with a
      shortened TTL) and attempt to accept it — confirm `409`, not a silent success.
- [ ] `DELETE /api/crm/invites/:inviteId` (as someone with `members:invite`) on a still-pending
      invite, then attempt to accept its token — confirm `409` (revoked, not just expired).
- [ ] Attempt to accept a garbage/unknown token — confirm `404 INVITE_INVALID`, not a `500`.

## 6. Funnel: Listing and updating members

- [ ] `GET /api/crm/members` as someone with `members:read` — confirm every granted staff member
      appears with correct `roleName`/`status`, and the list is empty-but-well-formed (not an
      error) on a fresh organization with only the SUPERADMIN.
- [ ] `PATCH /api/crm/members/:membershipId { "status": "DEACTIVATED" }` on a non-SUPERADMIN
      member — confirm `200`, then confirm that member's subsequent `/api/crm/*` requests all
      return `403` (a deactivated membership is treated as no access, not deleted).
- [ ] `PATCH /api/crm/members/:membershipId { "roleId": "<a different valid role id>" }` — confirm
      the member's permission set changes accordingly on their next request (e.g. promote a
      `Member` to `Admin`, then confirm they can now reach `GET /api/crm/members`, which `Member`
      alone cannot).
- [ ] `PATCH /api/crm/members/:membershipId` with neither `roleId` nor `status` in the body —
      confirm `422` (schema requires at least one).
- [ ] `PATCH /api/crm/members/:membershipId` with a `roleId` from a different organization (once
      more than one org exists, e.g. in a manually-crafted test scenario) — confirm `404
ROLE_NOT_FOUND`, not a cross-tenant write.

---

## 7. Known accepted limitations (Chunks 1–2) — please don't file these as bugs

- **No UI anywhere yet.** Every funnel above is API-only by design — Chunk 4 is the first
  `apps/admin` CRM screen.
- **No way to create a custom role, edit a built-in role's permissions, or view the full
  permission catalog grouped for a role-builder UI beyond `GET /permissions`'s flat list** — the
  custom-role builder is Chunk 9.
- **No org settings endpoint** (rename the organization, change plan) — deliberately not built
  this chunk; would be unused surface area before Chunk 3/4 need it.
- **No ownership-transfer endpoint.** The SUPERADMIN membership is genuinely immovable until
  Chunk 9 ships it — `PATCH /members/:id` on the SUPERADMIN's own row is expected to always
  `403`.
- **Single-organization assumption throughout.** `requirePermission` doesn't resolve "which org"
  from the request — it looks up the one row via `getOrganization()`. This is correct for the
  current scope (§2 of `PRD-CRM.md`) and is the one place a future multi-org chunk would change.
