# Creator leaderboard

## Purpose

The public `/leaderboard/creators` page — seven tabbed weekly creator rankings (Top XP, Top Creator, Most Likes, Most Engaged, Top Seller, Rising Creator, Most Achievements) that update live over a socket, no page refresh. A separate page from `/leaderboard` (brands), not a tab group bolted onto it — see rationale below.

## Structure

- `creatorLeaderboard.constants.ts` — the seven categories, their display labels, the socket event names, and the `?category=` URL param key. Unlike `../leaderboard`'s fixed four tabs, which tabs are actually shown is decided at render time by `CreatorLeaderboardTabs`, not by this constants file — an admin can disable any of the seven.
- `api/creatorLeaderboardApi.ts` / `creatorLeaderboardSchemas.ts` — `GET /creator-leaderboard?category=...` and `GET /creator-leaderboard/categories` clients and their zod response shapes.
- `hooks/useCreatorLeaderboard.ts` — fetches via `useQuery`, then keeps that query's cache fresh from the socket (`creator-leaderboard:updated`) rather than re-fetching. Same shape as `../leaderboard`'s `useLeaderboard`.
- `hooks/useCreatorLeaderboardCategories.ts` — fetches the seven categories' current enabled state, used to build the tab list dynamically.
- `components/CreatorLeaderboardView.tsx` — reads/writes the active category to the URL (`useSearchParams`/`router.replace`), same pattern as `../leaderboard`'s `LeaderboardView`.
- `components/CreatorLeaderboardTabs.tsx` — the tab pills, rendered only for categories `useCreatorLeaderboardCategories` reports as enabled.
- `components/CreatorLeaderboardList.tsx` — splits the fetched entries into the top 3 (→ `CreatorLeaderboardPodium`) and the rest (→ plain `CreatorLeaderboardRow` rows), plus loading/error/empty/disabled states. Reuses `LeaderboardListSkeleton` from `../leaderboard` directly rather than a second copy — the loading placeholder has nothing brand- or creator-specific about it.
- `components/CreatorLeaderboardPodium.tsx` / `CreatorLeaderboardPodiumCard.tsx` — the 1st/2nd/3rd banner cards. No banner-image fallback slot (creators don't have a banner image the way brands do) — every rank gets the same rank-colored gradient.
- `components/CreatorLeaderboardRow.tsx` — one rank-4+ row, linking to `/creator/:handle` instead of `/brand/:id`.

## Funnel

**User-facing:** open `/leaderboard/creators` (or via the navbar's Leaderboard dropdown → "Top creators", or the cross-link on the brand leaderboard page and vice versa). The top 3 creators get banner cards, ranks 4+ are a plain list, each with a category-specific score label and a movement indicator, live-updating exactly like the brand leaderboard. A creator can exclude themselves entirely from every category via a "Hide me from leaderboards" toggle on their own profile edit modal (`../creator-profile`) — opted-out creators simply never appear, in any category, starting from the next recompute.

**Technical:** `CreatorLeaderboardView` derives `category` from the URL and passes it to `CreatorLeaderboardList` → `useCreatorLeaderboard(category)`, which does an initial `GET /creator-leaderboard?category=...` fetch plus a socket subscription (`acquireSocketConnection`/`releaseSocketConnection`, the same shared `socketClient.ts` lifecycle `../leaderboard` and `explore`'s feed hook use) that emits `creator-leaderboard:subscribe`/`:unsubscribe` for the active category room and writes each `creator-leaderboard:updated` event straight into the matching `["creator-leaderboard", category]` query-cache entry. See `apps/api/src/modules/creator-leaderboard/README.md` for the server side.

## Non-obvious rationale

**This is a separate page (`/leaderboard/creators`) and feature, not a "Brands / Creators" tab group merged into `../leaderboard`'s existing page.** The two entity types' leaderboard entries are structurally different (`brandId`/`brandName`/`bannerUrl` vs. `creatorId`/`creatorName`/`creatorHandle`, no banner slot), and `../leaderboard`'s page copy, metadata, and info section are all written specifically about brands. Retrofitting a switcher into that page risked destabilizing an already-shipped, working feature for a merge that saves relatively little — a cross-link on each page to the other (plus a "Top creators" entry in the navbar's existing Leaderboard dropdown) gives the same discoverability with a much smaller, safer diff. `LeaderboardListSkeleton` is still reused directly, and every other component/hook/schema follows `../leaderboard`'s exact shape, one file at a time — this is a parallel feature by necessity of the data shape, not a from-scratch design.

**Tabs are built from a live `GET /creator-leaderboard/categories` call, not a hardcoded list like `../leaderboard`'s four.** Every one of the seven categories can be individually disabled by an admin (`apps/admin`'s `LeaderboardSection`), and a disabled category's tab shouldn't appear at all — showing a tab that then renders "This ranking isn't available right now" would be a worse experience than just not offering it. `CreatorLeaderboardList` still handles the disabled case defensively (`isEnabled: false` from the snapshot) for the moment between a category being disabled and this tab list re-fetching, not as the primary way a user finds out.
