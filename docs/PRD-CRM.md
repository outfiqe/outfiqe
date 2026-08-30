# Outfiqe Internal CRM — Product Reference

Internal reference doc, committed to the repo. This describes **what the CRM is, what every
section does, who can see it, the funnel a person walks through, and the request path through the
code** — written so someone new to the product can understand each area without reading the
source first. `TESTING-CRM.md` is the companion manual test pass.

---

## 1. What the CRM is

A relationship-management tool for Outfiqe's own staff — Sales, Support, and Ops — covering the
business's real creators, brands, and shoppers: subscriptions, partners, customers, a deal
pipeline, activities and tasks, support tickets, reporting, custom roles, and an audit log.

- **One product, one login.** It lives as a feature area inside the admin app
  (`apps/admin/src/features/crm`) and reuses the existing staff sign-in, the app shell, the
  sidebar, and the account menu. There is no separate CRM app, no second login, no public signup.
- **Multi-tenant by design.** Every CRM record belongs to an **organization**, and every screen
  is gated by a permission. Today Outfiqe runs its own organization plus demo organizations, but
  the schema is built so a real outside business can be given its own organization and handed
  ownership without a rearchitecture.
- **Link, don't duplicate.** Partners and Customers are live views over the existing commerce
  data (creator links, looks, orders), scoped to the brand an organization is linked to. The CRM
  never copies a creator or shopper profile — it always reads the source of truth.

### The sections

| Section   | Route                             | In one line                                              |
| --------- | --------------------------------- | -------------------------------------------------------- |
| Overview  | `/crm`                            | Who has access, invite a colleague, transfer ownership   |
| Billing   | `/crm/billing`                    | Subscription, seats, invoices, the 14-day trial          |
| Partners  | `/crm/partners`                   | Creators who promote or sell the linked brand            |
| Customers | `/crm/customers`                  | Shoppers who have bought the linked brand                |
| Pipeline  | `/crm/pipeline`                   | A configurable stage board of deals                      |
| Tasks     | `/crm/tasks`                      | Due-dated tasks; activities and timeline on detail pages |
| Support   | `/crm/support`                    | Complaint / request tickets with an internal thread      |
| Reports   | `/crm/reports`                    | Pipeline value and support health                        |
| Roles     | `/crm/roles`                      | Build custom roles; rename the organization              |
| Audit     | `/crm/audit`                      | An append-only trail of who changed what                 |
| Search    | header box on every `/crm/*` page | Find a partner, customer, deal, or ticket                |

---

## 2. Who uses it — access model

Access is **permission-based**, not a fixed set of job titles.

- **Permission keys** are grouped strings like `members:read`, `roles:manage`, `billing:manage`,
  `accounts:read` (partners), `customers:read`, `pipeline:configure`, `deals:write`,
  `tickets:manage`, `activities:write`, `reports:read`, `audit:read`.
- **Built-in roles**, seeded for every organization:
  - **Admin** — every permission a role can hold.
  - **Member** — a read-mostly subset: can see partners, customers, pipeline, tasks, tickets, and
    reports, but not roles, members, billing management, or the audit log.
- **Custom roles** — an organization can build its own roles from any subset of the catalog
  (see §12). Two keys are never grantable to a role: platform access (Outfiqe's own commerce
  admin) and the ability to transfer ownership.
- **The owner** is one person per organization, not a role. They implicitly have every permission
  and are the only one who can start an ownership transfer. Ownership moves only through the
  transfer flow — it can't be reassigned by editing a membership.

The sidebar hides a section a person's role can't use; the server enforces the same rules on
every request, so hiding a link is a convenience, not the security boundary.

### The advanced-features gate

Partners, Customers, Pipeline, Tasks, Support, Reports, and Search are **advanced features**.
They're available during the 14-day trial and while a subscription is active. If the trial lapses
with no active subscription, those sections show a "subscribe to keep using…" banner instead of
their content, and their API calls return a 402. Overview, Billing, Roles, and the Audit log
stay available regardless — a lapsed organization can still manage its account and review its
history.

---

## 3. Organizations and the brand link

- Each organization resolves from the request (by subdomain when one is configured, otherwise the
  single default organization). An unknown subdomain is a hard 404 — never a silent fall-through
  to another organization's data.
- An organization can be **linked to one commerce brand**. That link is what every
  partner/customer query is scoped by. One brand backs at most one organization.
- An organization with no linked brand (Outfiqe's own, or a newly provisioned one) shows a
  specific "not linked to a brand yet" empty state on Partners and Customers — not a blank list.

---

## 4. Overview (`/crm`)

**Purpose.** The landing page: see who has CRM access, invite a colleague, and — for the owner —
transfer ownership of the organization.

**Who can see it.** Anyone with a CRM membership. The member list itself needs `members:read`;
sending invites needs `members:invite`.

**User funnel.**

1. A staff member opens **CRM → Overview**. They see the organization name and plan, a banner if
   the trial has lapsed, an ownership-transfer banner if one is pending for them, and — if their
   role allows — the list of members with their roles and status.
2. To add someone: fill the invite form (email + role) and send. The invitee must already have an
   Outfiqe staff account — there is no CRM signup. They receive an email with an accept link.
3. The invitee, already signed in, opens the link. Accepting is what grants them CRM access;
   their normal admin login is unchanged.
4. The owner sees a **Transfer ownership** control on any active member's row. They confirm
   (optionally choosing to give up their own access afterwards); the recipient must accept from
   their own Overview banner before it takes effect. Either side can cancel while it's pending.

**How it works.** The Overview page and its member/invite/ownership components call the CRM API
(`/api/crm/organization`, `/members`, `/invites`, `/ownership-transfer`), which routes to the
`crm-access` module: controller → service (an invite target must be an existing staff account;
one pending invite per email; accepting requires the email to match; one pending transfer per
organization) → repository → database. Accepting an invite or an ownership transfer runs as a
single transaction.

---

## 5. Billing (`/crm/billing`)

**Purpose.** A per-seat subscription, paid through Outfiqe's existing eSewa / Khalti gateways
(there is no Stripe). Billing gates the advanced features, not sign-in itself.

**Who can see it.** `billing:read` to view; `billing:manage` to change the plan, change seats, or
cancel.

**The trial.** A new organization gets a 14-day trial with no card. During the trial — and while
a subscription is active — the advanced features are on. When the trial ends with no
subscription, the advanced sections show the subscribe banner.

**User funnel.**

1. **CRM → Billing** shows the current plan, seat count, trial countdown, and an invoice history.
   If a renewal invoice is open, a "pay now" banner appears.
2. **Change plan or seats** opens a checkout dialog. Checkout never sells fewer seats than the
   organization has active members.
3. Submitting redirects to the chosen payment gateway.
4. The gateway returns to a billing return page, which asks the server to verify the payment
   directly — the redirect itself is never trusted. On success the invoice is marked paid, the
   period rolls forward one month, and the subscription becomes active.
5. **Cancel** schedules the subscription to stop at the end of the current period.

**Behind the scenes.** Two scheduled jobs keep billing moving without anyone watching it: a
**renewal** job opens the next invoice near period end, starts the charge, and emails the
billing contacts a pay link (marking the subscription past-due if the period lapses unpaid, then
cancelled after a grace window); a **reconciliation** job re-checks invoices left pending and
voids ones that never completed. Marking an invoice paid advances the subscription exactly once,
even if a verify runs twice.

**How it works.** The billing section calls `/api/crm/billing*` → the `crm-billing` module:
controller → service (checkout / verify / cancel, using the shared payment-provider interface) →
repository. Whether the advanced features are currently on is also returned on
`/api/crm/organization`, so every page can gate itself without its own billing request.

---

## 6. Partners (`/crm/partners`, `/crm/partners/:creatorId`)

**Purpose.** A live, read-only list of the creators who have a commercial relationship with the
organization's linked brand.

**Who can see it.** `accounts:read`. Behind the advanced-features gate.

**Who counts as a partner.** Any creator connected to the linked brand by _any_ promotion or
sale signal: a creator link on one of the brand's products, a look that tags one, or an order
item attributed to the creator on a non-cancelled order. Each row shows tag-click count,
attributed order count, attributed revenue, and last activity.

**User funnel.** CRM → Partners → a searchable, paginated table. Clicking a row opens the partner
detail: a per-product breakdown and recent attributed orders **for this brand only**, plus the
activity timeline. A creator who promotes two brands appears in both organizations' lists with
per-brand-correct numbers. Opening a creator with no signal for this brand returns a 404 (not a
403 — the CRM doesn't reveal that a creator exists for another organization).

**How it works.** The Partners pages call `/api/crm/partners*` → the `crm-relationships` module:
controller → service → repository, which runs a single aggregating SQL query scoped by **both**
the linked brand and the organization. An optional heavier metric that fails is logged and
returned as blank rather than failing the whole list.

---

## 7. Customers (`/crm/customers`, `/crm/customers/:userId`)

**Purpose.** The same idea as Partners, for shoppers.

**Who can see it.** `customers:read`. Behind the advanced-features gate.

**Who counts as a customer.** Any shopper with at least one paid order item for a linked-brand
product. Each row shows order count, item count, total spent, and first / last order date. Buyer
personal data is limited to name and handle — the same limit the brand order view uses, since a
brand doesn't ship directly.

**User funnel.** Same shape as Partners: a searchable, paginated list; a detail page with the
order history filtered to the linked brand plus the merged activity timeline.

**How it works.** Same module and path as Partners (`crm-relationships`), a mirrored
brand-scoped aggregate query.

---

## 8. Pipeline & Deals (`/crm/pipeline`)

**Purpose.** A configurable board of stages, with deals moving across it. Every deal is attached
to a partner.

**Who can see it.** `pipeline:read` to view, `pipeline:configure` to add/rename/reorder stages;
`deals:read` / `deals:write` / `deals:delete` for the deals themselves. Behind the
advanced-features gate.

**User funnel.**

1. CRM → Pipeline shows a Kanban board: a column per stage, a card per deal (title, value,
   partner, owner). A default stage set (Lead → Contacted → Negotiating → Won → Lost) exists from
   the start.
2. With `deals:write`, **New deal** opens a form with a partner picker (fed by the same partner
   search as the Partners screen).
3. Cards move by drag-and-drop or a keyboard "move to" menu — both are supported.
4. Won and Lost are **stage properties**, not separate buttons: moving a card into a stage marked
   won or lost closes the deal and stamps the close date; moving it back to an open stage
   reopens it.
5. With `pipeline:configure`, **Configure stages** lets you add, delete, and reorder stages.

**How it works.** The Pipeline page calls `/api/crm/pipeline/stages` and `/deals` → the
`crm-pipeline` module: controller → service (a stage reorder is one transaction; a deal's partner
is validated live against the partner data) → repository.

---

## 9. Tasks, Activities & Timeline (`/crm/tasks`; timeline on detail pages)

**Purpose.** Two things: a record of interactions (note / call / message / email) against a
partner, customer, or deal; and due-dated tasks. Plus a **timeline** that merges those logged
interactions with live order history at read time — it's a view, never a copied feed.

**Who can see it.** `activities:read` / `activities:write`, `tasks:read` / `tasks:write`. Behind
the advanced-features gate.

**User funnel.**

- **Tasks** is a due-dated list with an overdue badge and a complete checkbox. **New task** takes
  a title, due date, and an assignee (choosing an assignee needs `members:read`). The assignee
  gets a notification.
- **Timeline**, shown on partner / customer / deal detail pages, interleaves logged activities
  and live order events, each tagged with its source, newest first. An inline composer logs a
  note / call / message / email without leaving the page. If the live order read fails, the
  timeline still shows the logged activities and notes that it's partial.

**How it works.** The Tasks page and timeline component call `/api/crm/timeline`, `/activities`,
and `/tasks` → the `crm-activities` module: controller → service (the timeline merge is wrapped
so a failure degrades to activities-only) → repository, where the merge is a single query that
unions logged activities with live orders and lets the database sort and page them.

---

## 10. Support (`/crm/support`)

**Purpose.** Complaint and request tickets against a customer or partner, with an internal
comment thread and an assignee.

**Who can see it.** `tickets:read` / `tickets:write` / `tickets:manage`. Behind the
advanced-features gate.

**User funnel.**

1. CRM → Support shows a status-filtered ticket list. **New ticket** takes a type
   (complaint / request), title, description, and the customer it's about.
2. Clicking a row expands the ticket inline: description, status controls, an assignee picker,
   and the comment thread.
3. Status moves forward through Open → In progress → Resolved → Closed (with defined reopen
   paths). An out-of-order jump is rejected, and so is a change made against a stale view. Moving
   to Resolved or Closed stamps the resolution time; reopening clears it.
4. Assigning a ticket notifies the assignee.

**How it works.** The Support page calls `/api/crm/tickets*` → the `crm-tickets` module:
controller → service (a status change is checked against the allowed-transitions table, then
applied with a guard so two people can't both move it) → repository. Every write is rate-limited.

---

## 11. Reports (`/crm/reports`)

**Purpose.** Two dashboards: pipeline health and support health. Every number is computed in the
database.

**Who can see it.** `reports:read`. Behind the advanced-features gate.

**User funnel.** CRM → Reports shows two cards:

- **Pipeline value by stage** — open / won / lost totals, plus a bar per open stage.
- **Support tickets** — open / resolved counts, mean time to resolve, and a status breakdown.

Each card has its own loading, error, and "not enough data yet" state (the first-record case).

**How it works.** The Reports section calls `/api/crm/reports/pipeline` and `/reports/tickets` →
the `crm-reporting` module: controller → service → repository, one aggregating SQL statement per
card. Nothing is fetched and reduced in application code.

---

## 12. Roles & settings (`/crm/roles`)

**Purpose.** Build custom roles from the permission catalog, and rename the organization.

**Who can see it.** `roles:read` to view, `roles:manage` to edit roles, `org:update` to rename.
Not behind the advanced-features gate.

**User funnel.**

1. CRM → Roles shows an organization-rename card (for `org:update`) and the role list.
2. Built-in roles show a badge and have no edit controls. Custom roles have edit and delete.
3. The role editor is a grouped checkbox matrix of every permission, minus the two that a role
   can never hold (platform access, ownership transfer).

**Key rules (enforced on the server, not just hidden in the UI).**

- A built-in role can't be edited or deleted.
- A role that any member still holds can't be deleted.
- An unknown or withheld permission key is rejected.
- A duplicate role name is rejected.
- Saving a role replaces its whole permission set in one transaction.

**Seat accounting.** The active-member count feeds Billing: checkout floors seats at that number,
and Billing shows "N in use".

**How it works.** The Roles section calls `/api/crm/roles` and `PATCH /api/crm/organization` →
the `crm-access` module: controller → service → repository. All role routes are rate-limited.

---

## 13. Audit log (`/crm/audit`)

**Purpose.** A per-organization, append-only trail of security-relevant changes.

**Who can see it.** `audit:read` — the built-in Admin role has it, Member does not; an
organization may grant it to a custom role. **Not** behind the advanced-features gate — a lapsed
organization can still review its history.

**What's recorded.** Invites (sent / revoked / accepted), member role and status changes,
custom-role create / update / delete, organization rename, the four ownership-transfer steps, and
subscription checkout / activation / cancellation. Each entry records the action, the outcome, a
readable summary sentence, who did it, their IP, and safe descriptive details — never a token, a
password, or a raw payment payload. Entries survive the actor being deleted (the name then shows
as "System").

**User funnel.** CRM → Audit shows a newest-first table (when / who / action / details) with a
"load more" button.

**How it works.** Each audited action records an entry right after it succeeds; recording is
best-effort and never blocks or fails the action it's logging. The Audit page calls
`/api/crm/audit` → the `crm-audit` module: controller → service → repository, paginated by a
stable keyset.

---

## 14. Global search (header box on every `/crm/*` page)

**Purpose.** One box that finds partners, customers, deals, and tickets.

**Who can see it.** Anyone who can read at least one of those types; results are then filtered to
exactly the types the person's role can read. Behind the advanced-features gate.

**User funnel.** Type two or more characters in the header box → grouped results (Partners /
Customers / Deals / Tickets) → pick one → land on its detail page or the relevant section.

**How it works.** The search box calls `/api/crm/search` → the `crm-reporting` module: the
service runs the permitted groups in parallel, each wrapped so one failing group returns nothing
rather than failing the search. Partner and customer results reuse the relationship data; deal
and ticket results are title matches backed by trigram indexes.

---

## 15. Real-time notifications

Assigning a **task** or a **ticket** notifies the assignee. This travels over the same Redis
Streams event bus and notification pipeline every other Outfiqe domain event uses — consumer
groups acknowledge on success, and a message that keeps failing lands in a dead-letter stream
after five attempts rather than retrying forever. Self-assignment doesn't notify.

---

## 16. Resilience & edge cases

- **Reads degrade, they don't 500.** The timeline merge, optional relationship metrics, and each
  search group catch failures, log them, and fall back (activities-only, a blank metric, an empty
  group).
- **Explicit empty states everywhere.** Every list, detail, and report has a distinct loading,
  empty, and error state — including "not linked to a brand" and "not enough data yet".
- **Concurrency is handled.** Ticket status changes, invoice settlement, invite acceptance, and
  ownership acceptance all use guarded writes, so a race ends in a clean conflict response or
  an exactly-once result, never a raw error.
- **Rate limiting.** Invites, organization creation, ownership transfer, role changes, billing
  checkout, and search each have their own limit; pipeline, activity, and ticket writes share a
  per-user limit.

---

## 17. Security

- **Organization isolation** is applied on every CRM query, and the linked-brand scope on every
  commerce read. Cross-organization detail lookups return 404, never 403.
- **Platform access** (Outfiqe's own commerce admin) is a separate permission that no default
  CRM role includes, so organization staff can't reach it.
- **No secret material** in error messages or audit entries.
- The surface is aligned with OWASP ASVS and the OWASP Top 10, and has been through a security
  review with no outstanding findings.

---

## 18. Data model (reference)

| Table                                                   | Holds                                                                  |
| ------------------------------------------------------- | ---------------------------------------------------------------------- |
| `Organization`                                          | One tenant; carries the linked brand and the owner membership          |
| `Membership` / `Role` / `Permission` / `RolePermission` | Who has access, with which role, granting which permission keys        |
| `OrganizationInvite`                                    | Pending invites (hashed token, TTL, single-use)                        |
| `OwnershipTransferRequest`                              | A pending owner handover and its state                                 |
| `Subscription` / `SubscriptionInvoice`                  | Plan, seats, period, and the invoice history                           |
| `PipelineStage` / `Deal`                                | The board and its cards                                                |
| `CrmActivity` / `CrmTask`                               | Logged interactions and due-dated tasks (one polymorphic subject each) |
| `CrmTicket` / `CrmTicketComment`                        | Support tickets and their internal threads                             |
| `CrmAuditLog`                                           | The append-only audit trail                                            |

Partners and Customers have **no tables** — they're live queries over the existing commerce data.

---

## 19. API surface (reference)

| Method & path                                                                        | Permission                            |
| ------------------------------------------------------------------------------------ | ------------------------------------- |
| `GET /api/crm/organization`                                                          | member                                |
| `PATCH /api/crm/organization`                                                        | `org:update`                          |
| `GET /api/crm/permissions`                                                           | member                                |
| `GET/POST/PATCH/DELETE /api/crm/roles`                                               | `roles:read` / `roles:manage`         |
| `GET /api/crm/members`, `PATCH /members/:id`                                         | `members:read` / `members:manage`     |
| `GET/POST/DELETE /api/crm/invites`, `POST /invites/accept`                           | `members:invite` (accept: signed-in)  |
| `POST /api/crm/ownership-transfer` (+ accept / decline / cancel)                     | `org:transfer_ownership`              |
| `GET /api/crm/billing`, `POST /billing/checkout` / `verify` / `cancel`               | `billing:read` / `billing:manage`     |
| `GET /api/crm/partners`, `/partners/:creatorId`                                      | `accounts:read` + advanced            |
| `GET /api/crm/customers`, `/customers/:userId`                                       | `customers:read` + advanced           |
| `GET/POST/PATCH/DELETE /api/crm/pipeline/stages`, `/deals`                           | `pipeline:*` / `deals:*` + advanced   |
| `GET /api/crm/timeline`, `.../activities`, `.../tasks`                               | `activities:*` / `tasks:*` + advanced |
| `GET/POST /api/crm/tickets`, `PATCH /:id/status` / `/assignee`, `POST /:id/comments` | `tickets:*` + advanced                |
| `GET /api/crm/reports/pipeline`, `/reports/tickets`                                  | `reports:read` + advanced             |
| `GET /api/crm/search`                                                                | any read permission + advanced        |
| `GET /api/crm/audit`                                                                 | `audit:read`                          |

---

## 20. Not yet built

- **Assignment notifications in the notification bell.** Assigning a task or ticket creates the
  notification record, but the shared notification row in the web and admin apps doesn't yet have
  a link rule for the CRM types, so it isn't surfaced in the bell dropdown.
- **Per-list filters** (status, owner, date range) on Partners, Customers, and Deals. Support
  tickets already have a server-side status filter.
- **Contacts** — a person-level record separate from the creator/shopper accounts.

Module-level detail lives in each `apps/api/src/modules/crm-*/README.md` and
`apps/admin/src/features/crm/README.md`.
