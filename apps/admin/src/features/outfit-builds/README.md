# outfit-builds

## Purpose

The admin Outfit builds section: find any build, see everything about it, unlock or archive it
with a reason, and read the weekly Outfit Build numbers.

## Structure

- `components/OutfitBuildsPage.tsx` — two tabs. "Builds": search by title or owner, filter by status and who
  can see it, a paged list linking to each build, empty/loading/error states. "Metrics":
  `BuildMetricsSection`.
- `components/OutfitBuildDetailPage.tsx` — people, items on the board, locked versions, what viewers see,
  looks posted from the build, photos, open reports, the history (paged, newest first), and
  Unlock / Archive (shown only to staff with `platform:builds:manage`; each asks for a reason in
  `TextPromptModal`).
- `components/BuildMetricsSection.tsx` — a period picker (4, 12, 26 or 52 weeks), a week-by-week table
  (builds started alone or from a chat, locked, made public, comments, likes, saves, full-set and
  picked-item orders), the current shared and public totals, and commission earned at each rate.
- `api/outfitBuildsApi.ts` — calls to `/api/platform/builds…` and the paged list and history hooks.
- `api/outfitBuildsSchemas.ts` — Zod mirrors of the API views.

Routes: `_authenticated.outfit-builds.index.tsx` (`/outfit-builds`) and
`_authenticated.outfit-builds.$outfitId.tsx`. The "Outfit builds" sidebar item is in
`PLATFORM_NAV_ITEMS`.

## Funnel

**User-facing:** staff open Outfit builds, search, open a build and read its details and history.
A moderator can unlock a locked build or archive one, giving a reason; the page refreshes with the
new status and the change appears in the history and the audit log.

**Technical:** page → `useAdminBuilds` / `useQuery` / `useAdminBuildHistory` → `outfitBuildsApi`
→ `/api/platform/builds…` → `apps/api/src/modules/outfit-admin`.
