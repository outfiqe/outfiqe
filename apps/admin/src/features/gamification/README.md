# gamification

## Purpose

The admin control surface for the whole gamification system (spec 29–33/40): an overview of platform-wide XP/badge stats, the `Level` ladder, per-activity XP config and anti-abuse limits, the full badge catalog (create/edit, rule-based or admin-award), and manual actions — hand-awarding or removing a badge, granting or docking a user's XP — each with a mandatory reason.

## Structure

- `schemas.ts` — Zod response schemas mirroring the API's admin DTOs (`Level`, `ActivityXpConfig`, `BadgeAdmin`, `ManualAward`, `XpStats`, `BadgeStats`, `AwardBadgeResult`, `AdjustXpResult`) plus the enum value lists (`badgeCategorySchema`, `achievementMetricSchema`, etc.) hand-mirrored from the API's Prisma enums, same pattern `packages/types` already uses elsewhere in this monorepo.
- `api.ts` — `gamificationApi`, one function per admin endpoint under `/xp/*` and `/badges/*`.
- `StatsSection.tsx` — the overview tiles (spec 29), reusing `StatCard` from `../trending/TrendStatCards` directly by file path rather than duplicating it — a plain two-prop presentational component with nothing trending-specific about it.
- `LevelsSection.tsx` — `Level` list + create form + edit modal (name/required XP/icon, plus an `isActive` toggle — there's no delete; see the API's `xp/README.md` for why).
- `ActivityConfigSection.tsx` — the `ActivityXpConfig` list + edit modal (enabled/XP amount/daily limit/cooldown/max-per-entity) — only rows that already exist are listed; there's no "add a new activity type" here, since `XpActivityType` is a fixed enum, not admin-defined data.
- `BadgesSection.tsx` — the badge catalog: a list of cards plus a create form / edit modal built around one shared `BadgeFields` component. Its core is the requirement-type toggle: checking "Admin-award only" swaps the form from a requirement-type-plus-conditions editor to a single assignment-limit field, mirroring the API's `createBadgeSchema`/`updateBadgeSchema` discriminated union exactly (see rationale below).
- `ManualActionsSection.tsx` — three pieces: `AwardBadgeForm` (pick an active badge, a user id, a reason), `AdjustXpForm` (user id, a signed amount, a reason), and `ManualAwardsList` (every currently-manual, not-yet-removed `UserBadge`, each with a `Remove` button that prompts for a removal reason via `window.prompt`).
- `GamificationPage.tsx` — composes the five sections in one page, same shape as `../commissions/CommissionsPage.tsx`.

## Funnel

**User-facing:** an admin opens **Gamification** from the sidebar, sees the overview tiles at a glance, adjusts levels/activity XP/badges as needed, and uses the manual-action forms at the bottom for one-off awards, removals, or XP corrections — each action requires typing a reason before it goes through.

**Technical:** every section is an independent `useQuery`/`useMutation` pair against `gamificationApi`, invalidating its own query key (and, where relevant, `admin-badge-stats`) on success — there's no single page-level data-fetch, each section owns its own loading/error state, same as `../commissions`' `CommissionTiersSection`/`CommissionsListSection` split. `BadgesSection` and `ManualActionsSection` both query `["admin-badges"]` independently (same literal key in two files) rather than sharing an export, so React Query's cache naturally dedupes the actual network request without either file importing from the other.

## Non-obvious rationale

**`Select`/`Checkbox` are new `packages/design-system` primitives, added as part of this feature.** Neither existed before this chunk — every previous admin form only needed text/number inputs. Both are plain native `<select>`/`<input type="checkbox">` styled to match `input.tsx`, not Radix-based, matching `multi-select.tsx`'s own internal option-picker (also a styled native `<select>`) rather than introducing a new interaction pattern this design system doesn't otherwise use. See `packages/design-system/README.md`.

**Every form field has an explicit `id`/`htmlFor` pair, including a per-row `idPrefix` for `BadgesSection`'s create-form vs. edit-modal instances and its per-condition rows.** The pattern this feature's forms are modeled after (`../commissions/CommissionTiersSection.tsx`) uses bare `<label>` text with no `htmlFor`, an existing accessibility gap not worth fixing wholesale there but not worth propagating into new code either — screen readers can't associate an unlabelled control with its label otherwise. Static ids are safe for `ActivityConfigSection`'s and `ManualActionsSection`'s forms (each renders at most one instance at a time); `LevelsSection`'s and `BadgesSection`'s fields take an `idPrefix` prop because their create form and edit modal can be mounted simultaneously (create form always visible/toggleable, edit modal opens on top of it), and two elements sharing one `id` on the same page is its own real bug, not just a style nit.

**The badge create/edit form's "Admin-award only" checkbox is a UI-level toggle over one `BadgeFormState`, not two separate forms.** `toFormInput` reads `form.isAdminAward` and emits either `{ requirementType: "ADMIN_AWARD" }` (no `conditions` key at all) or `{ requirementType, conditions }` — matching the API's `.strict()` discriminated union exactly, so an admin can't submit a shape the backend would reject. The conditions/assignment-limit sub-fields the toggle hides stay in local state even while hidden, so switching the checkbox back and forth doesn't lose what was typed.

**Manual badge award targets a user by pasting their ID, not a name/handle search.** This app has an existing admin user-search endpoint scoped to creators only (`../creators`); XP/badge actions can target _any_ user, not just creators, and building a general "search any user" admin endpoint is bigger scope than this chunk needs. An admin acting on a specific user typically already has their id from another admin screen. Flagged as a deliberate scope cut, not an oversight — worth revisiting if manual actions turn out to be a frequent workflow.
