# CRM Relationships

## Purpose

The Partners and Customers views of a CRM tenant's own commercial relationships, read live from
Outfiqe's commerce tables — never copied into CRM-owned rows. A **Partner** is a creator tied to
the tenant's linked brand by any promotion or sale signal; a **Customer** is a shopper who has
bought the linked brand's products. Every query is scoped to `Organization.linkedBrandId`.

## Structure

- `crm-relationships.constants.ts` — page-size defaults/caps, the bounded offset window, the
  settled-payment-status set, and the `ORGANIZATION_NOT_LINKED_TO_BRAND` reason code.
- `crm-relationships.types.ts` — `PartnerSummary`/`CustomerSummary`, the `RelationshipListPage`
  envelope (`items` + `total` + `hasMore` + `reason`), and the detail shapes.
- `crm-relationships.repository.ts` — raw SQL for the aggregate list and detail-core queries
  (grouped in the database, never fetch-then-reduce), plus Prisma for the small
  recent-orders/recent-attributed-orders reads and `isBrandPartner`.
- `crm-relationships.service.ts` — resolves the org's `linkedBrandId`, returns an empty page with
  a `reason` when there is none (list endpoints) or a `404` (detail endpoints), clamps the page
  window, and exposes `isPartner(organization, creatorId)` for later chunks (deal subjects).
- `crm-relationships.controller.ts` / `crm-relationships.routes.ts` — `GET /api/crm/partners`,
  `/partners/:creatorId`, `/api/crm/customers`, `/customers/:userId`. The router is mounted at
  `/api/crm` **before** `crm-access`'s router; it only defines these four paths, so every other
  `/api/crm/*` request falls through untouched.
- `crm-relationships.schemas.ts` — Zod validation for the list query (`q`, `page`, `pageSize`) and
  the id params.
- `crm-relationships.integration.test.ts` — two-brand isolation, the not-linked reason, the
  advanced-features gate, and cross-tenant `404`s, end-to-end against a real database.

## Funnel

**User-facing:** a member with `accounts:read` / `customers:read` opens the Partners or Customers
tab in the CRM area, searches by name/handle, pages through the list, and opens a row for a
per-product breakdown (partners) or recent order history (customers) — all filtered to the
tenant's own brand.

**Technical:** `crm-relationships.routes.ts` → `resolveTenant` → `requireAuth` →
`requireAdvancedCrmFeatures` (from `crm-billing`) → `requirePermission` →
`crm-relationships.controller.ts` → `crm-relationships.service.ts` →
`crm-relationships.repository.ts` (`$queryRaw` / Prisma) → Postgres.

## Non-obvious rationale

- **Brand-scoping _is_ tenant isolation for this chunk.** Partner/Customer data lives entirely in
  commerce tables that carry no `organizationId`; filtering every query by the resolved
  organization's `linkedBrandId` is exactly what keeps one tenant from seeing another's creators
  and shoppers. `organizationId` starts mattering as a second scope key once later chunks add
  CRM-owned rows (deals, activities, tickets) that reference these people by id.
- **Partner = any one of three signals**, unioned in SQL: a `CreatorLink` on one of the brand's
  products, a `CreatorLookProduct` tagging one, or an `OrderItem` with `attributed_creator_id` set
  on one. The list's derived columns (tag-click count, attributed order count + revenue) are
  `LEFT JOIN`ed aggregates, so a creator who only ever made a link still appears, with zeroes.
- **Detail lookups `404` when the id has no signal for _this_ brand**, rather than `403` — the
  same "don't reveal that a row exists in another tenant" reasoning `orders`' buyer lookup uses.
  `findPartnerCore`/`findCustomerCore` return `null` when every metric is zero / there are no
  orders, and the service turns that into a `PARTNER_NOT_FOUND` / `CUSTOMER_NOT_FOUND`.
- **List pagination is a bounded offset window, not a keyset cursor.** The sort keys are computed
  aggregates (revenue, spend, last activity), which make a stable keyset cursor awkward, and a
  single tenant brand's partner/customer set is modest. `MAX_RELATIONSHIP_RESULT_WINDOW` caps the
  offset so the query stays bounded regardless of the page number requested.
- **Cancelled orders are excluded everywhere** (`fulfilment_status <> 'CANCELLED'`); `totalPaid`
  additionally only sums `payment_status = 'PAID'` items, so a COD order that was placed but never
  paid still makes someone a Customer without inflating their spend.
- **The advanced-feature gate is enforced here via `requireAdvancedCrmFeatures`** (from
  `crm-billing`) — a lapsed trial with no subscription gets a `402 ADVANCED_FEATURES_LOCKED` on
  these routes, matching the `PlanGateBanner` the admin already shows.
