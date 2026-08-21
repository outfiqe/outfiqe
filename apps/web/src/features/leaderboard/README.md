# Leaderboard

## Purpose

The public `/leaderboard` page and the navbar's "Leaderboard" dropdown — four tabbed weekly brand rankings (Trending, Most purchased, Most loved, Fastest growing) that update live over a socket, no page refresh. Ranks brands only — `../creator-leaderboard` is the sibling feature for the seven creator rankings, a separate page (`/leaderboard/creators`) rather than a tab group here, see that feature's README for why.

## Structure

- `leaderboard.constants.ts` — the four category tabs and the runtime `LEADERBOARD_CATEGORY` object, `satisfies`-checked against `LeaderboardCategory` from `@outfiqe/types` (the same object shape `apps/api` derives independently from that same shared type — see that module's README). Also the socket event names and the `?category=` URL param key.
- `api/leaderboardApi.ts` / `leaderboardSchemas.ts` — `GET /leaderboard/brands?category=...` client and its zod response shape.
- `hooks/useLeaderboard.ts` — fetches via `useQuery`, then keeps that query's cache fresh from the socket (`leaderboard:updated`) rather than re-fetching.
- `components/LeaderboardView.tsx` — reads/writes the active category to the URL (`useSearchParams`/`router.replace`), same pattern as `features/explore`'s tab state.
- `components/LeaderboardTabs.tsx` — the tab pills.
- `components/LeaderboardList.tsx` — splits the fetched entries into the top 3 (→ `LeaderboardPodium`) and the rest (→ plain `LeaderboardRow` rows), plus loading/error/empty states.
- `components/LeaderboardPodium.tsx` / `LeaderboardPodiumCard.tsx` — the 1st/2nd/3rd banner cards.
- `components/LeaderboardRow.tsx` / `LeaderboardListSkeleton.tsx` — one rank-4+ row, and the loading placeholder (mocks both the podium cards and the row list, matching the real layout shape).
- `components/LeaderboardInfoSection.tsx` — the "How rankings work" / "Reading the board" cards, rendered full-width near the bottom of the page (see `page.tsx`), not beside the list.

## Funnel

**User-facing:** open `/leaderboard` (or a specific tab from the navbar dropdown, e.g. "Most purchased"). The top 3 brands get banner cards (brand banner image or a rank-colored gradient fallback, avatar, name, metric, a link to the brand page); ranks 4+ are a plain list below that. Each row/card shows a category-specific metric ("214 sold", "+184%") and a movement indicator (`↑3` / `↓2` / flat / "New"). Switching tabs re-subscribes to that category's live updates; an entry updates in place the moment the server recomputes or increments its score — no refresh, no polling. Below the list, a static two-card section explains what each category measures and how to read the podium colors / movement icons.

**Technical:** `LeaderboardView` derives `category` from the URL and passes it to `LeaderboardList` → `useLeaderboard(category)`. That hook does two independent things: an initial `GET /leaderboard/brands?category=...` fetch via `useQuery`, and a socket subscription (`acquireSocketConnection`/`releaseSocketConnection` from the shared `socketClient.ts`, same lifecycle pattern as `features/explore`'s `useExploreFeedSocket`) that emits `leaderboard:subscribe`/`leaderboard:unsubscribe` for the active category room and, on `leaderboard:updated`, writes the fresh snapshot straight into the matching `["leaderboard", category]` query-cache entry via `queryClient.setQueryData` — no manual local state, no refetch. See `apps/api/src/modules/leaderboard/README.md` for the server side (Redis ZSETs → Redis Streams event bus → this socket event).

## Non-obvious rationale

**The socket listener updates by the _event's_ category, not the currently-viewed one.** `useLeaderboard`'s `leaderboard:updated` handler writes to `["leaderboard", payload.category]`, not `["leaderboard", category]` (the hook's own argument). This matters because a stale query-cache entry for a tab you're not currently looking at should still get refreshed in the background so switching back to it doesn't show outdated data while the next fetch completes.
