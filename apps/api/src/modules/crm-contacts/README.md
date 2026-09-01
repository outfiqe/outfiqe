# CRM Contacts

## Purpose

Person-level CRM records a tenant keeps by hand — leads, prospects, vendors, press — separate
from the creator/shopper accounts that `crm-relationships` derives from commerce data. A contact
can optionally be linked to a real `User` and carries a lifecycle stage, tags, an owner, and free
notes. Every row is scoped to `Organization`; nothing here reads or writes commerce tables.

## Structure

- `crm-contacts.constants.ts` — page-size default/cap and the tag-count cap.
- `crm-contacts.types.ts` — `ContactRecord`, `ContactWithRelations` (adds owner + linked-user
  display fields), the `ContactListPage` envelope (`items` + `total` + `hasMore`), and the
  create/update input shapes.
- `crm-contacts.schemas.ts` — Zod validation for the list query (`q`, `lifecycleStage`, `page`,
  `pageSize`), the create/update bodies, and the id param.
- `crm-contacts.repository.ts` — Prisma queries, every one scoped by `organizationId`. `list` does
  `skip`/`take` offset pagination with a parallel `count`; `q` matches name/email/company
  case-insensitively.
- `crm-contacts.service.ts` — business rules: an `ownerMembershipId` must belong to the same
  organization, a `linkedUserId` must resolve to a real account, and a duplicate email inside one
  organization is a `409 CONTACT_EMAIL_TAKEN` off the `@@unique([organizationId, email])`
  constraint (caught, not pre-checked).
- `crm-contacts.controller.ts` / `crm-contacts.routes.ts` — `GET/POST /api/crm/contacts`,
  `GET/PATCH/DELETE /api/crm/contacts/:contactId`. The router is mounted at `/api/crm` **before**
  `crm-access`'s router, defining only these paths so every other `/api/crm/*` request falls
  through.
- `crm-contacts.integration.test.ts` — end-to-end through `testApp` + a real database:
  tenant isolation, permission gating, email dedupe, owner/linked-user validation.

## Funnel

**User-facing:** a member with `contacts:read` opens the Contacts tab, searches by name/email/
company, filters by lifecycle stage, and pages through the list. A member with `contacts:write`
adds or edits a contact (name, email, phone, company, title, stage, tags, owner, notes);
`contacts:delete` removes one.

**Technical:** `crm-contacts.routes.ts` → `resolveTenant` → `requireAuth` →
`requireAdvancedCrmFeatures` → `requirePermission(contacts:*)` (+ `crmWriteRateLimit` on writes)
→ `crm-contacts.controller.ts` (reads the resolved organization via `getResolvedOrganization`)
→ `crm-contacts.service.ts` → `crm-contacts.repository.ts` → Postgres.

## Non-obvious rationale

- **A contact is not a `User` and not a Partner/Customer.** `crm-relationships` already exposes
  the people a tenant transacts with, computed live from orders/promotions. `Contact` is the
  manually-managed record for everyone else, and `linkedUserId` is the optional bridge when a
  contact turns out to also hold an account — kept nullable so a contact can exist before (or
  without) any account. This mirrors how a CRM keeps contacts as the base object and treats
  "customer" as a stage, not a separate table.
- **Email uniqueness is per organization, and only for a set email.** `@@unique([organizationId,
email])` with a nullable `email` lets many contacts have no email while still blocking a
  duplicate of a specific address inside one tenant. Cross-tenant duplicates are expected and
  allowed.
