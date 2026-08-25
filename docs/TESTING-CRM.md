# Outfiqe Internal CRM — Test Plan

Covers Chunks 1, 2, and 4 (tenant/PBAC foundation schema, CRM access + subdomain tenant
resolution on existing admin auth, the first `apps/admin` CRM screen) on branch
`feat/crm-tenant-pbac-foundation`. §2–7 are an API-level pass against `/api/crm/*` directly
(curl/Postman) — useful for exercising edge cases the UI doesn't surface a control for yet. §8
covers the same flows through the actual `apps/admin` UI. Organized as funnels, matching
[TESTING-CHAT.md](./TESTING-CHAT.md)'s format.

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
- [ ] `PATCH /api/crm/members/:membershipId` with a `roleId` from a different organization
      (create a second org directly in the DB, per §7) — confirm `404 ROLE_NOT_FOUND`, not a
      cross-tenant write.

## 7. Funnel: Subdomain tenant resolution

There's only ever one real `Organization` in this build (`db:seed` creates it with subdomain
`outfiqe`), so this funnel manufactures a second one directly in the DB to prove isolation —
`apps/admin` itself never visits a per-org subdomain (see `docs/PRD-CRM.md` §9).

- [ ] Confirm `outfiqe.localhost:4000` resolves without any hosts-file changes — modern OS/browser
      resolvers treat every `*.localhost` name as loopback automatically (RFC 6761). `curl -s
http://outfiqe.localhost:4000/health` should succeed exactly like `http://localhost:4000/health`.
- [ ] As the seeded SUPERADMIN, `curl -H "Host: outfiqe.localhost:4000" .../api/crm/organization`
      — confirm `200` and the same organization as the no-subdomain request.
- [ ] Open Prisma Studio (`pnpm --filter @outfiqe/api db:studio`), create a second `Organization`
      row with a distinct `subdomain` (e.g. `acme-test`) and its own `Role`/`Membership` for a
      second staff account. Hit `GET /api/crm/organization` with `Host: acme-test.localhost:4000`
      logged in as that second account — confirm it resolves to the _second_ org, not Outfiqe's.
- [ ] With that same second-org session, set `Host` back to a subdomain belonging to the _first_
      org (or to no subdomain at all) — confirm the response is `403` (no membership there), never
      a silent view into the wrong org's data.
- [ ] Hit any `/api/crm/*` route with `Host: no-such-org.localhost:4000` — confirm `404
ORGANIZATION_NOT_FOUND`, not a fallback to the default org.
- [ ] Hit any `/api/crm/*` route with `Host: www.localhost:4000` or `Host: api.localhost:4000` —
      confirm these resolve via the single-org fallback (reserved words are treated as "no tenant
      signal", not as an unknown-org 404).

---

## 8. Funnel: Through the apps/admin UI

- [ ] Log in to `apps/admin` as the seeded SUPERADMIN (`admin@outfiqe.local`) — open **CRM** in
      the sidebar. Confirm the organization name/plan banner renders and you appear in the member
      list with a SUPERADMIN badge, role `Select` and Deactivate button both disabled on your own
      row.
- [ ] Fill in the invite form with a second existing `UserRole.ADMIN` account's email and a role,
      submit — confirm it appears under "Pending invites" with a Revoke button, and a real email
      arrives in that inbox (this build has `GMAIL_APP_PASSWORD` configured, so it's a real send,
      not a console stub).
- [ ] Click the emailed link — confirm it lands on `/crm/invites/accept`, shows "Accepting your
      invite…" briefly, then a success state with a "Go to CRM" button; confirm that account is
      now visible in the CRM member list.
- [ ] As the SUPERADMIN, change that new member's role via the `Select` in their row — confirm no
      page reload is needed and the row updates in place.
- [ ] Click Deactivate on that member's row, then confirm (either via a second session or by
      checking `GET /api/crm/members` directly) their access now returns `403` on every
      `/api/crm/*` route.
- [ ] Revoke a still-pending invite from the Pending invites list — confirm it disappears (or
      updates to `REVOKED`) without a page reload.
- [ ] Log in as a staff account with no CRM `Membership` at all and open `/crm` directly — confirm
      the page fails gracefully (an inline error, not a blank crash) rather than assuming access.

---

## 9. Known accepted limitations (Chunks 1, 2, 4) — please don't file these as bugs

- **No way to create a custom role, edit a built-in role's permissions, or view the full
  permission catalog grouped for a role-builder UI beyond `GET /permissions`'s flat list** — the
  custom-role builder is Chunk 9.
- **No org settings endpoint** (rename the organization, change plan) — deliberately not built
  this chunk; would be unused surface area before Chunk 3/4 need it.
- **No ownership-transfer endpoint.** The SUPERADMIN membership is genuinely immovable until
  Chunk 9 ships it — `PATCH /members/:id` on the SUPERADMIN's own row is expected to always
  `403`.
- **`apps/admin` never actually visits a per-org subdomain**, even though the backend now
  resolves tenants by subdomain (§7). There's still only one real organization and one shared
  frontend; the resolution mechanism is provably correct (§7's funnel, plus
  `crm-access.integration.test.ts`) but isn't exercised by any real `apps/admin` request today —
  it only becomes observable once a second org has its own subdomain-serving frontend, which
  isn't built.
