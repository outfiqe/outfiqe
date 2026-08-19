# Brand Applications

## Purpose

Lets a prospective brand apply to sell on Outfiqe through a public form, and lets an admin
review, approve, or reject that application. Approving one provisions a `Brand` record and a
time-limited invite the brand uses to set up their account.

## Structure

- `brandApplication.routes.ts` — `POST /` (public, rate-limited), `GET /` (admin, cursor-paginated,
  filterable by status), `POST /:id/approve`, `POST /:id/reject` (both admin-only).
- `brandApplication.controller.ts` — reads validated request data, calls the service, sends the
  response envelope.
- `brandApplication.service.ts` — business rules: only a `PENDING` application can be reviewed,
  approving creates the `Brand` + `BrandInvite` in one transaction and emails an invite link,
  rejecting emails the brand with an optional reason.
- `brandApplication.repository.ts` — Prisma queries, including the `approve` transaction (brand +
  invite + application status, all-or-nothing).
- `brandApplication.schemas.ts` — Zod request validation (create body, list query, id param, reject
  body).
- `brandApplication.types.ts` — shared types derived from the schemas and Prisma model.
- `brandApplication.integration.test.ts` — colocated integration test; exercises the routes above
  end-to-end through `testApp` + a real test database (see `apps/api/src/testing/README.md`).

## Funnel

**User-facing:**

1. A prospective brand fills out the public application form on the marketing site.
2. An admin sees it appear (as `PENDING`) in the admin panel's Brand Applications list.
3. The admin approves or rejects it. Approve emails the brand a signup invite link; reject emails
   them with an optional reason.

**Technical:**

`brandApplication.routes.ts` → `brandApplication.controller.ts` → `brandApplication.service.ts` →
`brandApplication.repository.ts` → Postgres (via Prisma). Approval additionally writes a `Brand`
and a `BrandInvite` in the same DB transaction as the status update, so a brand is never left
half-provisioned.

## Non-obvious rationale

- `approve` rejects (409 `ALREADY_REVIEWED`) if the application isn't `PENDING` — this guards
  against a double-click or two admins approving the same application concurrently; only the first
  request wins.
- The brand invite token is generated as an opaque token and only its hash is stored
  (`generateOpaqueToken`/`hashToken` from `#lib/opaque-token.utils.js`), the same pattern used for
  other invite/reset flows in this codebase — the raw token only ever exists in the outbound email.
