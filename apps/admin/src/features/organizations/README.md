# Organizations (apps/admin)

## Purpose

Platform-level screen for onboarding new CRM tenant organizations. Deliberately separate from
`apps/admin/src/features/crm` — this is "create a new independent tenant," not anything scoped to
one tenant's own data, so it's gated on the platform `UserRole.ADMIN` role rather than any CRM
`Membership`/permission.

Onboarding is invite-only and identity-linked: a platform SUPERADMIN can only hand a new
organization to a business that already has an existing Outfiqe account (a `Brand`/`BrandMembership`
owner) — never an arbitrary email or a freshly created account. There's still no public self-serve
signup.

## Structure

- `schemas.ts` — `Organization`/`OrganizationCreationSuggestion` Zod schemas mirroring the API's
  response shapes. `Organization` carries `linkedBrandId`/`linkedBrandName`;
  `OrganizationCreationSuggestion` carries `existingOrganizationForBrand`.
- `api.ts` — `organizationsApi.list`/`.suggestFromBrand`/`.create`, thin `apiClient` calls against
  `GET /api/crm/organizations`, `GET /api/crm/organizations/suggest`, `POST /api/crm/organizations`.
  `.create` takes a single `{ name, subdomain, targetOwnerUserId, linkedBrandId }` input.
- `BusinessOwnerField.tsx` — brand-search autocomplete for picking the business to onboard, same
  shape as `features/gamification/BadgesSection/BrandSponsorField.tsx`, built on the shared
  `brandsApi.search` (`apps/admin/src/lib/brandsApi.ts`) rather than a third local copy of that
  search call.
- `OrganizationsPage.tsx` — list + inline create form: pick a business, review the
  auto-suggested (editable) subdomain and any organizations that business already owns, hit Create.

Route: `apps/admin/src/routes/_authenticated.organizations.index.tsx` (`/organizations`). Uses the
`.index` suffix from the start — see `features/crm/README.md`'s non-obvious rationale for why a
bare `_authenticated.organizations.tsx` would silently become a layout-parent trap the moment any
nested route under `/organizations/*` is ever added. Sidebar entry added to `AdminSidebar.tsx`.

## Funnel

**User-facing:** a platform admin opens Organizations, searches for a business already on Outfiqe,
picks it. A subdomain is suggested from the business's name (editable before submitting), and any
organizations that business already owns are shown plainly rather than hidden. Hitting Create makes
the organization immediately, but the picked business doesn't own it yet — they get the same
"you've been asked to become the owner" notification and accept/decline banner as any other
ownership transfer, and only become SUPERADMIN once they accept. The platform admin who created it
is removed from the organization entirely the moment that happens.

**Technical:** `BusinessOwnerField` → `brandsApi.search` → `GET /api/brands`. Once picked,
`organizations/api.ts`'s `suggestFromBrand` → `GET /api/crm/organizations/suggest` (`apps/api`'s
`crm-access.controller.ts` → `.service.ts`'s `suggestOrganizationFromBrand`, which resolves the
brand's owner via `brandRepository.findOwnerUserId` and a candidate subdomain via
`slugifyHandle`/`withHandleSuffix`, the same collision-retry helpers `user.repository.ts` already
uses for handles). Submitting calls `POST /api/crm/organizations` with the resolved
`targetOwnerUserId` and the picked `linkedBrandId` — `crm-access.service.ts`'s `createOrganization` creates the org with the
calling staff member as its initial SUPERADMIN (unchanged from before), then creates a Membership
for the target owner and immediately kicks off an ownership transfer to them with
`removeSenderMembershipOnAccept: true`, reusing the existing ownership-transfer accept/decline flow
verbatim rather than inventing a second acceptance mechanism.

## Non-obvious rationale

- **Org creation still makes the calling staff member the initial SUPERADMIN — ownership moves to
  the real business only after they accept.** This isn't a new acceptance mechanism bolted onto
  organization creation; it's the same `OwnershipTransferRequest` flow (`crm-access` module) every
  other ownership handoff already uses, just triggered automatically as part of creation instead of
  a manual "Transfer ownership" click. Reusing it means the accept/decline UI, the email, and the
  audit trail are all already correct with zero new frontend surface for the business side.
- **`removeSenderMembershipOnAccept` is always `true` for this flow, never a choice the platform
  admin makes here** — unlike the manual "Transfer ownership" checkbox in `features/crm`, a platform
  staff member concierge-provisioning an organization for an external business has no legitimate
  reason to remain a member once the real owner takes over. See `crm-access`'s README for the full
  reasoning on why that decision is a choice in the manual transfer flow but not here.
- **The subdomain suggestion is always editable, never silently committed.** `Brand` has no slug
  field, so the suggestion is derived by slugifying the brand's name and retrying with a random
  suffix on collision (the exact same pattern `createWithUniqueHandle` already uses for `User.handle`)
  — but a slug collision or an undesirable auto-generated name is still possible, so the platform
  admin always sees and can override the final value before submitting.
- **An already-onboarded business is never blocked, only surfaced.** A real company can legitimately
  run more than one business needing its own separate CRM organization. `ownerExistingOrganizations`
  on the suggestion response is shown as a plain informational banner, not a hard stop — silently
  blocking it would be a false restriction, and silently allowing it with no visibility risks
  accidental duplicate onboarding.
- **The picked business is persisted as `Organization.linkedBrandId` at create time.** Every
  later CRM chunk (Partners, Customers, deals, tickets, reporting) scopes a tenant's real
  commerce data — orders, creator links, looks — by this brand id, so provisioning has to record
  it, not just use it to derive a subdomain. Unlike `ownerExistingOrganizations` (same owner, a
  _different_ brand — allowed, surfaced), linking the _same_ brand to a second organization is
  hard-blocked by a DB `@unique` and comes back as `BRAND_ALREADY_LINKED`; the page shows
  `existingOrganizationForBrand` as a warning banner before the staffer even submits.
- **The org list row shows linked-brand status** (`linked to <brand>` / `no linked brand`) so a
  platform admin can see at a glance which tenants are wired to real data and which are still
  shells.
- **`brandsApi.search` lives in `apps/admin/src/lib/`, not this feature.** It was already duplicated
  once between `features/gamification` and `features/platform-commission` before this feature
  existed; adding a third local copy here would have made that worse. This is the first time it's
  been pulled into a proper shared location — the other two call sites haven't been migrated to it,
  since consolidating pre-existing duplicates wasn't in scope for this change.
