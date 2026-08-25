# Organizations (apps/admin)

## Purpose

Platform-level screen for creating and listing CRM tenant organizations. Deliberately separate
from `apps/admin/src/features/crm` — this is "create a new independent tenant," not anything
scoped to one tenant's own data, so it's gated on the platform `UserRole.ADMIN` role rather than
any CRM `Membership`/permission.

## Structure

- `schemas.ts` — `Organization` Zod schema mirroring the API's response shape.
- `api.ts` — `organizationsApi.list`/`.create`, thin `apiClient` calls against
  `GET`/`POST /api/crm/organizations`.
- `OrganizationsPage.tsx` — list + inline create form, same shape as
  `features/team/TeamPage.tsx` and `features/crm/InviteSection.tsx`.

Route: `apps/admin/src/routes/_authenticated.organizations.index.tsx` (`/organizations`). Uses the
`.index` suffix from the start — see `features/crm/README.md`'s non-obvious rationale for why a
bare `_authenticated.organizations.tsx` would silently become a layout-parent trap the moment any
nested route under `/organizations/*` is ever added. Sidebar entry added to `AdminSidebar.tsx`.

## Funnel

**User-facing:** a platform admin opens Organizations, fills in a name and subdomain, hits Create.
They become that new organization's SUPERADMIN immediately — no separate "assign yourself" step.

**Technical:** `OrganizationsPage.tsx` → `organizations/api.ts` (`apiClient`) →
`POST /api/crm/organizations` (`apps/api`'s `crm-access.controller.ts` →
`.service.ts` → `.repository.ts`, one transaction: `Organization` + built-in `Role`s +
the creator's `Membership` + `superAdminMembershipId`) → Postgres.

## Non-obvious rationale

- **No client-side subdomain-to-URL preview.** The frontend doesn't know the deployment's base
  domain (`TENANT_BASE_DOMAIN` is an API-only env var) — showing a real clickable
  `https://<subdomain>.<domain>` link would mean either duplicating that value into a
  `VITE_`-prefixed env var or deriving it from `window.location`, neither done here. The new
  organization's `subdomain` is shown as plain text; visiting it is a manual step for now.
- **`apiClient` already calls same-origin `/api` paths** (`apps/admin/src/lib/apiClient.ts`), so
  once a real subdomain-serving proxy is in front of this app in a given environment, creating an
  org here and then navigating to its subdomain already resolves to the right tenant — nothing
  else in this feature needs to change for that to work.
