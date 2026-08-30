# Outfiqe Internal CRM — Manual Test Plan

A manual pass over the whole CRM: access control, organizations, billing and the trial, partners,
customers, pipeline, activities and tasks, support tickets, reports, roles, the audit log, and
global search. §2–§14 are API-level checks against `/api/crm/*` directly (curl / Postman) — good
for the edge cases the UI has no control for. §15 walks the same ground through the `apps/admin`
UI. Organised as funnels, matching [TESTING-CHAT.md](./TESTING-CHAT.md).

`docs/PRD-CRM.md` is the product reference — read it first for what each section is and who can
see it.

---

## 1. Accounts and setup

| Thing you need               | How to get it                                                                                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A staff account              | Seeded via `ADMIN_BOOTSTRAP_EMAIL` / `ADMIN_BOOTSTRAP_PASSWORD` in `apps/api/.env`, or `POST /api/auth/register/admin` if that path is open in your build. Needed for every funnel — CRM access always sits on an existing admin login.                 |
| The seeded owner             | `pnpm --filter @outfiqe/api db:seed` grants the first `UserRole.ADMIN` account it finds the owner (SUPERADMIN) membership of the seeded platform organization. Re-run it if you bootstrapped your admin account after the first seed — it's idempotent. |
| A second staff account       | Any other `UserRole.ADMIN` account. This is the "invitee" for the invite funnels — it must already exist, since there is no CRM signup.                                                                                                                 |
| A seeded tenant organization | The seed also creates two demo tenant organizations (Meridian Apparel Co., Norday Studio), each linked to a demo brand, each with their own staff account. Use these for brand-scoped data (partners, customers) and for tenant-isolation checks.       |
| The platform organization    | The seeded Outfiqe organization has **no linked brand** — use it to check the "not linked to a brand" empty states.                                                                                                                                     |

**Before any funnel:** run migrations and seed against your target database —

```bash
pnpm --filter @outfiqe/api db:deploy   # applies all migrations (no interactive prompt)
pnpm --filter @outfiqe/api db:seed     # idempotent — safe to re-run
```

Get a bearer token for any staff account:

```bash
curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<email>","password":"<password>"}' | jq -r .data.accessToken
```

Every request below assumes `-H "Authorization: Bearer $TOKEN"`. Where a request is
tenant-scoped, also send `-H "Host: <subdomain>.localhost:4000"` for the organization you mean
(the demo orgs each have their own subdomain; the platform org's is `outfiqe`).

---

## 2. Funnel: no CRM membership

- [ ] As a staff account **never** granted CRM access, `GET /api/crm/organization` — confirm
      `403`, not a `500` or a silent empty body.
- [ ] Same account: `GET /api/crm/roles`, `/members`, `/invites`, `/partners`, `/customers`,
      `/pipeline/stages`, `/deals`, `/tasks`, `/tickets`, `/reports/pipeline`, `/audit`,
      `/search?q=ab` — confirm every one is `403`.
- [ ] Same account: `GET /api/crm/permissions` — confirm `200` (the static catalog, readable by
      any staff account).
- [ ] The same requests with **no** `Authorization` header — confirm `401`, not `403` (auth
      failure and permission failure are distinct).

## 3. Funnel: the seeded owner

- [ ] As the account the seed made owner, `GET /api/crm/organization` — confirm `200`, the `id`
      matches the platform organization row, and the response carries `viewerIsSuperAdmin: true`
      with the full `viewerPermissionKeys` list.
- [ ] `GET /api/crm/members` — confirm the owner appears with its role and an owner marker.
- [ ] `PATCH /api/crm/members/:ownMembershipId` (any body) — confirm `403
SUPERADMIN_MEMBERSHIP_LOCKED`. The owner only moves via ownership transfer (§6).
- [ ] Re-run `db:seed` — confirm no duplicate organization / role / membership rows and the
      owner membership id is unchanged.

## 4. Funnel: inviting a colleague

- [ ] As the owner (or anyone with `members:invite`), `GET /api/crm/roles` — note the `Member`
      role id.
- [ ] `POST /api/crm/invites { "email": "<second staff email>", "roleId": "<Member role id>" }`
      — confirm `201`.
- [ ] Repeat the identical request — confirm `409 INVITE_ALREADY_PENDING`, not a second row.
- [ ] `POST /api/crm/invites` for an email that isn't a staff account — confirm `404
STAFF_ACCOUNT_NOT_FOUND` (the "no CRM signup" rule).
- [ ] `POST /api/crm/invites` for someone who already holds a membership — confirm `409
MEMBER_EXISTS`.
- [ ] `POST /api/crm/invites` with a `roleId` from another organization — confirm `404
ROLE_NOT_FOUND`, never a cross-tenant read.
- [ ] As a plain `Member` (no `members:invite`), `POST /api/crm/invites` — confirm `403`.
- [ ] `GET /api/crm/invites` as the inviter — the pending invite shows with `status: "PENDING"`
      and the right role name.
- [ ] Hammer `POST /api/crm/invites` past the rate limit — confirm it eventually returns `429`
      with a `Retry-After` header.

## 5. Funnel: accepting an invite

The invite email logs to the console in local dev unless `GMAIL_APP_PASSWORD` is set — read the
raw token from the log line, or from the DB at the moment it's generated (only the hash is
stored).

- [ ] As the invited account, `POST /api/crm/invites/accept { "token": "<raw token>" }` — confirm
      `201` and a membership now exists with the invited role.
- [ ] Repeat with the same token — confirm `409` (already accepted; not a second membership).
- [ ] With a **fresh** invite, try to accept it as a different account than it was addressed to —
      confirm `403 INVITE_EMAIL_MISMATCH`.
- [ ] Expire an invite (or shorten the TTL in a test env) and accept it — confirm `409`, not a
      silent success.
- [ ] `DELETE /api/crm/invites/:id` a still-pending invite, then accept its token — confirm
      `409` (revoked).
- [ ] Accept a garbage token — confirm `404 INVITE_INVALID`, not a `500`.

## 6. Funnel: ownership transfer

- [ ] As the owner, `POST /api/crm/ownership-transfer { "targetMembershipId": "<an active,
non-owner member>" }` — confirm `201` and a pending transfer on the org response.
- [ ] `POST /api/crm/ownership-transfer` again while one is pending — confirm `409` (one at a
      time).
- [ ] As the **target**, accept the transfer — confirm `200`, the org's owner membership is now
      the target's, and the previous owner is a normal member (or removed, if the sender chose
      "remove my access after").
- [ ] Start another transfer, then as the sender **cancel** it — confirm it's gone and the owner
      is unchanged.
- [ ] Start another, then as the target **decline** it — same.
- [ ] As a non-owner, `POST /api/crm/ownership-transfer` — confirm `403`.

## 7. Funnel: billing and the trial

- [ ] Provision a fresh organization (§8) and `GET /api/crm/organization` — confirm
      `advancedFeaturesEnabled: true` and a `trialEndsAt` roughly 14 days out.
- [ ] `GET /api/crm/billing` as `billing:read` — confirm the plan, seat count, trial end, and an
      empty invoice history render without error.
- [ ] Set that org's `trialEndsAt` to the past directly in the DB, with no subscription row.
      `GET /api/crm/partners` — confirm `402 ADVANCED_FEATURES_LOCKED`. `GET /api/crm/audit` and
      `GET /api/crm/billing` — confirm still `200` (not behind the gate).
- [ ] `POST /api/crm/billing/checkout { "plan": "<plan>", "seats": <n> }` with `seats` below the
      active member count — confirm it's rejected / floored, never sells fewer seats than members.
- [ ] `POST /api/crm/billing/checkout` with valid input — confirm a provider redirect URL comes
      back and an `OPEN` invoice row is created.
- [ ] `POST /api/crm/billing/verify { "invoiceId": "<id>" }` against a completed test payment —
      confirm the invoice is `PAID`, `currentPeriodEnd` advanced ~1 month, subscription `ACTIVE`,
      and `advancedFeaturesEnabled` is `true` again.
- [ ] Call `verify` on the same invoice twice — confirm the subscription advances only once.
- [ ] `POST /api/crm/billing/cancel` — confirm `cancelAtPeriodEnd` is set and access holds until
      period end.
- [ ] Run the renewal job manually — confirm it opens the next invoice near period end and emails
      a pay link; run the reconciliation job — confirm it voids an invoice left `OPEN` past the
      window.
- [ ] As a role with `billing:read` but not `billing:manage`, `POST /api/crm/billing/checkout` —
      confirm `403`.
- [ ] Confirm no response body from any billing endpoint leaks a raw provider error, stack trace,
      or SQL.

## 8. Funnel: provisioning an organization and the brand link

- [ ] As a platform-access account, `POST /api/crm/organizations { "name": "...", "subdomain":
"...", "linkedBrandId": "<a brand id>" }` — confirm `201`, the caller is its owner, and the
      row carries `linked_brand_id`, a default pipeline stage set, and a ~14-day `trial_ends_at`.
- [ ] `POST /api/crm/organizations` with a `linkedBrandId` already linked to another org —
      confirm `409 BRAND_ALREADY_LINKED`, no raw Prisma message.
- [ ] `POST /api/crm/organizations` with a different brand for an owner who already has an org —
      confirm `201` with an informational "already has an organization" flag, not a block.
- [ ] As a tenant-only staff account, `POST /api/crm/organizations` — confirm `403` (platform
      access only).

## 9. Funnel: partners

Run as a **demo tenant** staff account (Meridian or Norday), with that org's `Host`.

- [ ] `GET /api/crm/partners` — confirm the list contains only creators tied to _this_ org's
      linked brand (a link, a look tag, or an attributed order), with tag-click count, attributed
      order count, attributed revenue, and last activity per row.
- [ ] Run the same against the **other** demo org — confirm a different set. A creator active for
      both brands appears in both, with per-brand-correct numbers.
- [ ] `GET /api/crm/partners?q=<name fragment>` — confirm it filters; `?page=2&pageSize=25` —
      confirm the window and `hasMore` / `total` are correct at the boundary (exactly `pageSize`
      rows, `pageSize + 1`, empty).
- [ ] `GET /api/crm/partners/:creatorId` for a real partner — confirm the per-product breakdown
      and recent attributed orders are all scoped to this brand only.
- [ ] `GET /api/crm/partners/:creatorId` for a creator with no signal for this brand — confirm
      `404`, not `403`.
- [ ] As the **platform** org (no linked brand), `GET /api/crm/partners` — confirm an empty list
      with a distinct "not linked to a brand" reason, not a generic empty.
- [ ] As a role without `accounts:read`, `GET /api/crm/partners` — confirm `403`.

## 10. Funnel: customers

- [ ] `GET /api/crm/customers` as a demo tenant — confirm only shoppers with a paid order for
      this brand's products, with order count, item count, total spent, first / last order date.
- [ ] `GET /api/crm/customers/:userId` — confirm the order history is filtered to this brand and
      the buyer PII is limited to name / handle (no address).
- [ ] Cross-tenant `GET /api/crm/customers/:userId` for someone who only bought the other brand —
      confirm `404`.
- [ ] Platform org — confirm the "not linked to a brand" reason.
- [ ] Pagination boundary and search as in §9.
- [ ] Without `customers:read` — confirm `403`.

## 11. Funnel: pipeline and deals

- [ ] `GET /api/crm/pipeline/stages` on a fresh org — confirm the default set (Lead → Contacted →
      Negotiating → Won → Lost) with one stage marked won and one lost.
- [ ] `POST /api/crm/pipeline/stages` as `pipeline:configure` — confirm a new stage appends;
      reorder with the full ordered id list — confirm it applies atomically; send a partial or
      duplicate id list — confirm it's rejected whole, nothing half-applied.
- [ ] `DELETE` a stage that has deals — confirm the defined behaviour (blocked or reassigned),
      never orphaned deals.
- [ ] `POST /api/crm/deals { "stageId": ..., "title": ..., "value": ..., "partnerCreatorId": ...
}` with a real partner — confirm `201`; with a creator who isn't a partner of this brand —
      confirm it's rejected.
- [ ] `PATCH` a deal's `stageId` to the won stage — confirm `status` becomes `WON` and
      `closedAt` is stamped in the same write; move it back to an open stage — confirm it
      reopens and `closedAt` clears.
- [ ] `pipeline:read` / `deals:read` without the write keys — confirm reads work, writes `403`.
- [ ] Cross-tenant: a deal / stage id from another org — confirm `404`.
- [ ] Hammer the deal write endpoints past the shared per-user limit — confirm `429`.

## 12. Funnel: activities, tasks, and the timeline

- [ ] `POST /api/crm/activities { "type": "CALL", "body": ..., "partnerCreatorId": ... }` —
      confirm `201`; send two subject ids (e.g. both `partnerCreatorId` and `dealId`) — confirm
      it's rejected (exactly one subject).
- [ ] `GET /api/crm/timeline?subjectType=customer&subjectId=<id>` — confirm it interleaves
      logged activities and live orders for that customer, newest first, each tagged with its
      source.
- [ ] Stub the live order read to throw (or point at a broken DB) and re-request the timeline —
      confirm it returns the activities only with `partial: true`, never a `500`.
- [ ] `POST /api/crm/tasks { "title": ..., "dueAt": ..., "assigneeMembershipId": ... }` — confirm
      `201` and the assignee receives a notification (check the `notifications` stream / their
      notification list). Assign a task to yourself — confirm no self-notification.
- [ ] `PATCH` a task to done — confirm `status: DONE` and `completedAt` stamped; a task with a
      past `dueAt` shows as overdue in `GET /api/crm/tasks`.
- [ ] Without `activities:write` / `tasks:write` — confirm reads work, writes `403`.
- [ ] Cross-tenant subject id — confirm `404`.

## 13. Funnel: support tickets

- [ ] `POST /api/crm/tickets { "type": "COMPLAINT", "title": ..., "description": ...,
"customerUserId": ... }` — confirm `201`, status `OPEN`.
- [ ] `PATCH /api/crm/tickets/:id/status { "status": "RESOLVED" }` directly from `OPEN` — confirm
      it's rejected as an out-of-order jump (`409 INVALID_TICKET_TRANSITION`).
- [ ] Walk `OPEN → IN_PROGRESS → RESOLVED → CLOSED` — confirm each step is accepted and
      `resolvedAt` is stamped on entering `RESOLVED` / `CLOSED`.
- [ ] Reopen from `RESOLVED` — confirm `resolvedAt` clears.
- [ ] Two clients `PATCH` the same ticket's status from the same starting value — confirm one
      wins and the other gets `409 TICKET_STATUS_CHANGED`, not a lost update.
- [ ] `PATCH /api/crm/tickets/:id/assignee` as `tickets:manage` — confirm the assignee is
      notified; as a role without `tickets:manage` — confirm `403`.
- [ ] `POST /api/crm/tickets/:id/comments` — confirm the internal thread appends.
- [ ] `GET /api/crm/tickets?status=OPEN` — confirm the server-side filter works.
- [ ] Cross-tenant ticket id — confirm `404`. Hammer the writes past the shared limit — `429`.

## 14. Funnel: reports, roles, audit, and search

**Reports**

- [ ] `GET /api/crm/reports/pipeline` — confirm open / won / lost counts and per-stage value are
      correct against the deals you created; an empty stage still returns a zero row.
- [ ] `GET /api/crm/reports/tickets` — confirm open / resolved counts and mean time to resolve;
      on an org with zero resolved tickets, confirm a clean "not enough data" shape, not a
      divide-by-zero or `null` crash.
- [ ] Without `reports:read` — `403`.

**Roles**

- [ ] `POST /api/crm/roles { "name": "Support agent", "permissionKeys": ["tickets:read",
"tickets:write"] }` — confirm `201`.
- [ ] `PATCH` / `DELETE` a **built-in** role — confirm `403 ROLE_IS_BUILT_IN`.
- [ ] `DELETE` a custom role that a member still holds — confirm `409 ROLE_IN_USE`.
- [ ] `POST` / `PATCH` a role including `platform:access` or `org:transfer_ownership` — confirm
      `400 INVALID_PERMISSION_KEYS`.
- [ ] `POST` a role with a name that already exists — confirm `409 ROLE_NAME_TAKEN`.
- [ ] `PATCH /api/crm/organization { "name": "..." }` as `org:update` — confirm the rename;
      without it — `403`.
- [ ] Assign the "Support agent" role to a member and confirm they can reach `/api/crm/tickets`
      but not `/api/crm/roles` or `/api/crm/partners`.

**Audit**

- [ ] After doing the invite, role-change, ownership-transfer, and billing funnels above,
      `GET /api/crm/audit` as `audit:read` — confirm an entry per action, newest first, each with
      actor, outcome, IP, and a readable summary.
- [ ] Confirm **no** entry contains a token, password, reset link, or raw payment payload.
- [ ] Delete the actor user for one entry directly in the DB, re-request — confirm the entry
      still lists (actor shows as "System"), not a `500`.
- [ ] `GET /api/crm/audit` with a lapsed trial — confirm still `200`.
- [ ] As the built-in `Member` role — confirm `403`.
- [ ] Paginate with the cursor — confirm no gaps or repeats across pages.

**Search**

- [ ] `GET /api/crm/search?q=<partner name fragment>` as a role with `accounts:read` only —
      confirm results are grouped and contain **only** the Partners group (no deals / tickets /
      customers the role can't read).
- [ ] Same query as a full Admin — confirm all four groups where matches exist.
- [ ] `q` of one character — confirm it's rejected / returns nothing (2-char minimum).
- [ ] Point one group's underlying query at a failure — confirm that group returns empty and the
      rest still return, never a `500`.
- [ ] With a lapsed trial — confirm `402`.

---

## 15. Funnel: through the apps/admin UI

- [ ] Sign in as the seeded owner and open **CRM** in the sidebar. Confirm the flat CRM section
      lists Overview / Partners / Customers / Pipeline / Tasks / Support / Reports / Roles /
      Audit / Billing, the header shows the two-tone **CRM** wordmark and the search box, and
      "Overview" is only highlighted on `/crm` itself — not on every sub-route.
- [ ] Sign in as a plain **Member**-role account — confirm the sidebar hides Roles, Audit, and
      Billing management, and each hidden route still refuses its data call if opened by URL.
- [ ] **Overview** — invite a second staff account (email + role), confirm it appears under
      pending invites with a Revoke control and a real email arrives. Click the emailed link —
      confirm it lands on `/crm/invites/accept`, shows a brief "accepting…" state, then a success
      screen with a "Go to CRM" button, and that account is now in the member list.
- [ ] Change that member's role via the row `Select` — confirm the row updates with no reload.
      Deactivate them — confirm their `/api/crm/*` calls then `403`.
- [ ] As the owner, use **Transfer ownership** on that member's row — confirm the confirm modal
      (with the "remove my access after" checkbox), then that the recipient sees an accept /
      decline banner on their own Overview and nothing happens until they accept.
- [ ] **Billing** — with the org's trial set to expired, confirm the subscribe banner shows above
      Partners / Customers / Pipeline / Tasks / Support / Reports, and Billing / Roles / Audit
      stay usable. Open the plan checkout modal, confirm it won't let you pick fewer seats than
      members, submit, and confirm the redirect and the return page's verify result.
- [ ] **Partners / Customers** — as a demo tenant account, confirm the list shows only that
      brand's people, search debounces, the empty state distinguishes "not linked to a brand"
      from "none yet", and a row opens a detail page with the timeline.
- [ ] **Pipeline** — confirm the Kanban board renders the default stages, a card moves by drag
      **and** by the keyboard "move to" menu, dropping into the Won stage closes the deal, and
      "Configure stages" is only present with `pipeline:configure`.
- [ ] **Tasks** — create a task with an assignee, confirm the overdue badge on a past-due one and
      the complete checkbox; confirm the assignee gets a toast / notification.
- [ ] **Support** — create a ticket, confirm the status buttons only offer legal forward moves,
      the assignee `Select` notifies, and the comment thread posts inline.
- [ ] **Reports** — confirm both cards render with real data, and each shows its own "not enough
      data yet" state on an org with none.
- [ ] **Roles** — build a custom role from the checkbox matrix, confirm `platform:access` /
      `org:transfer_ownership` aren't offered, a built-in role is read-only, and deleting an
      in-use role surfaces the inline error.
- [ ] **Audit** — confirm the table lists the actions from the steps above, newest first, with a
      working "Load more".
- [ ] **Search** — type a partner name in the header box, confirm grouped results and that
      selecting one navigates to its detail page.
- [ ] Sign in as a staff account with no membership and open `/crm` by URL — confirm a graceful
      inline message (pointing at checking the subdomain), not a blank crash.

---

## 16. Known accepted limitations — please don't file these as bugs

- **Assignment notifications don't appear in the notification bell yet.** Assigning a task or
  ticket creates the notification record, but the shared notification row in web / admin has no
  link rule for the CRM entity types, so it isn't rendered in the bell dropdown. The record and
  the real-time event are correct.
- **No per-list filters** (status / owner / date range) on Partners, Customers, or Deals. Support
  tickets already have a server-side status filter.
- **No Contacts.** There's no person-level record separate from the creator / shopper accounts.
- **`apps/admin` runs one frontend for every organization.** Subdomain tenant resolution is
  proven correct (§9–§10 isolation checks, plus `crm-access.integration.test.ts`), but there is
  no per-organization frontend deployment today.
