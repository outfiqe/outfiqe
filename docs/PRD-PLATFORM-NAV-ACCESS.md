# Outfiqe Platform Navigation Access — PRD

Internal reference doc, committed to the repo. Small, scoped feature.

**Draft status — not yet built.** No branch/commits exist for this yet. Build later.

---

## 1. Problem

Every platform admin account today gets an all-or-nothing view: once `requirePlatformAccess`
passes (`ADMIN` role + active platform-org membership that is SUPERADMIN or holds
`platform:access`), the admin sidebar renders the **entire** `PLATFORM_NAV_ITEMS` list
(`apps/admin/src/components/AdminSidebar.tsx`) and every `/api/*` admin route accepts the request.

Outfiqe has 3–4 co-founders. They want to invite other people as platform admins for day-to-day
work (catalog, orders, creators) **without** those invites seeing or touching the sensitive
surfaces — Gamification, the payout/finance screens, Impersonation, Team, Organizations.

## 2. Scope

- A small **exclusive group** (the co-founders) who always see the full platform navbar and are
  the only accounts that can change what everyone else sees.
- One **global** visibility config: a show/hide toggle per platform navbar item. One config for
  the whole platform — not per-admin, not per-tenant.
- A **co-founder-only screen** to flip those toggles.
- Regular platform-admin invites see the navbar **minus** whatever the co-founders hid. Their
  access to everything else is unchanged from today.

### Out of scope

- Per-admin granularity (every non-co-founder admin is governed by the same one config).
- Anything tenant-scoped — this does not touch `TenantFeatureOverride` / the per-tenant
  "Feature flags" screen (`apps/admin/src/features/platform-features/`).
- The separate global gamification kill-switch (`PRD` note in
  [[outfiqe-gamification-toggle-plan]] — "is gamification live on the storefront"). Different
  concern, different mechanism.
- Changing `requirePlatformAccess` or the existing 5 `platform:*` control-plane keys.

## 3. The co-founder group

- A boolean flag on the platform-org `Membership` (e.g. `isPlatformSuperAdmin`), seeded for the
  3–4 co-founder accounts.
- Capped: a service guard refuses promoting a 5th (`MAX_PLATFORM_SUPER_ADMINS = 4`).
- The existing single `Organization.superAdminMembershipId` (platform-org owner) is always one of
  the group.
- A co-founder implicitly sees every navbar item regardless of the visibility config, and is the
  only account allowed to call the config write endpoint or open the config screen.
- Only an existing co-founder can promote/demote another; every change writes a `platform-audit`
  row (mechanism already exists in `apps/api/src/modules/platform-audit/`).

## 4. Visibility config

- A stable key per platform navbar item (`gamification`, `commissions`, `platform-commission`,
  `withdraw-requests`, `withdraw-policy`, `financial-rollup`, `platform-metrics`,
  `platform-features`, `platform-impersonation`, `organizations`, `team`, `products`,
  `collections`, `categories`, `size-options`, `hero-slides`, `orders`, `product-reviews`,
  `trending`, `creators`, `delivery-zones`, `brand-applications`).
- Stored as a single platform-level record: `hiddenNavKeys: string[]` (absence = visible).
  Default: **nothing hidden** — co-founders opt items out.
- Reads fail open to "visible" so a config-store error never blanks the navbar.

## 5. Enforcement

- **Navbar:** `AdminSidebar` filters `PLATFORM_NAV_ITEMS` by `hiddenNavKeys` for non-co-founders;
  co-founders bypass the filter. Follows the existing `isCrmSubItemVisible` pattern in
  `AdminSidebar.utils.ts`.
- **Server-side (sensitive items only):** the money + ops surfaces get a real check, not just a
  hidden nav link — `Gamification`, `Commissions`, `Platform commission`, `Withdrawal requests`,
  `Withdrawal policy`, `Financial rollup`, `Impersonation`, `Feature flags`, `Team`,
  `Organizations`. A `requirePlatformNavItem(key)` middleware (sibling of `requirePlatformRole`)
  stacks after `requireAdmin` on those route files and returns `403` when the key is hidden and
  the caller is not a co-founder. ~9–11 route files.
- **Pure-catalog items** (`Products`, `Collections`, `Categories`, `Sizes`, `Hero slides`,
  `Orders`, `Product reviews`, `Trending debug`, `Creators`, `Delivery zones`,
  `Brand applications`) are nav-only hides — every platform admin already has that access today,
  so hiding is declutter, not a security boundary.

## 6. API surface (illustrative)

```
GET    /api/platform/nav-access                 # { isCoFounder, hiddenNavKeys, coFounders[] }
PUT    /api/platform/nav-access/hidden          # co-founder only; body { hiddenNavKeys: string[] }; audited
POST   /api/platform/nav-access/co-founders     # co-founder only; promote a platform membership; capped; audited
DELETE /api/platform/nav-access/co-founders/:membershipId   # co-founder only; demote; audited
```

`GET /api/auth/me` also returns `isCoFounder` and `hiddenPlatformNavKeys` so the sidebar renders
without an extra round-trip.

## 7. Admin UI

- New "Navigation access" item in the Platform nav section, rendered only when `isCoFounder`.
- The screen: the full navbar-item list with a show/hide switch each, plus a small co-founder
  roster (add/remove, showing the 4-cap).
- Uses `@outfiqe/design-system` primitives (`Toggle`/`Checkbox`, `Button`, `FormBanner`).

### 7.1 Co-founder badge

Co-founders carry a visible marker so it's obvious who holds the exclusive access:

- A small `Badge` (design-system) reading **"Co-founder"** (variant: a distinct accent, e.g. gold/
  amber) next to their name wherever platform admins are listed — the Team screen, the
  "Navigation access" roster, and any member/assignee picker that shows platform staff.
- The same badge under the signed-in user's name in the `AdminSidebar` header when
  `isCoFounder`.
- Purely presentational — driven by `isCoFounder` / `isPlatformSuperAdmin`, no separate field.
  Copy ("Co-founder" vs "VIP" vs "Exclusive") is an open question in §11.

## 8. Data model

| Table / column                                                                                          | Notes                                                                    |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `Membership.isPlatformSuperAdmin` (bool, default `false`)                                               | Only meaningful on platform-org memberships. Seeded for the co-founders. |
| `PlatformNavAccess` (single-row) — `id`, `hiddenNavKeys String[]`, `updatedAt`, `updatedByMembershipId` | The one global config. Seed an empty row.                                |

Migration + a seed/backfill: create the empty `PlatformNavAccess` row, set
`isPlatformSuperAdmin = true` for the current platform-org owner (and any other known co-founder
accounts).

## 9. Rollout

- On deploy, nothing is hidden and the co-founder flag is set only for known accounts →
  existing admins are unaffected until a co-founder hides something.
- Co-founders then hide the sensitive items from the new screen.

## 10. Tests

- Unit: nav-filter helper (co-founder bypass, hidden-key filter, fail-open).
- Integration: `requirePlatformNavItem` returns `403` for a hidden key + non-co-founder, `200`
  for a co-founder; co-founder cap guard; audit rows written.
- Component: the "Navigation access" screen renders for a co-founder, is absent otherwise, toggles
  persist.
- Add new files to each app's `coverage.include`.

## 11. Open questions

- Confirm the exact co-founder accounts to seed.
- Confirm the sensitive-vs-catalog split in §5 before wiring middleware.
- Whether demoting the last co-founder should be blocked outright (recommended: yes).
- Badge copy and colour — "Co-founder" / "VIP" / "Exclusive".
