# product-tour

## Purpose

Short guided walkthroughs, one per dashboard, that show a new brand owner or approved creator where things live, one step at a time with Back / Next / Skip. Each opens by itself the first time that account type reaches `/overview`, remembers per account (on the server) that it was seen, and can be replayed at any time.

## Structure

- `components/BrandDashboardTour.tsx` / `components/CreatorDashboardTour.tsx` — decide whether their tour is open, using the shared `useTourController` hook, and feed the steps to the design-system `Tour` (`@outfiqe/design-system`), which knows nothing about brands, creators, or this content. Mounted by `brand-dashboard`'s `BrandOverview` / `creator-dashboard`'s `CreatorOverview` once each has loaded.
- `hooks/useTourController.ts` — the logic shared by every tour: whether it should open (eligible, saved progress loaded, not already seen at this version, not closed already this visit), or opened because of a replay link; moving between steps; saving the outcome on close; and clearing the replay query param once it has been read. Each dashboard's component only supplies its own tour key, version, and an `isEligible` flag.
- `constants/brandDashboardTour.ts` / `constants/creatorDashboardTour.ts` — each tour's key, **version**, steps (title, body, and which element each one points at), and replay link.
- `constants/tourReplay.ts` — the shared `?tour=` query param name, the shared "Take the tour" label, and `buildTourReplayHref`.
- `constants/tourOutcome.ts` — the two outcome values (`COMPLETED`, `DISMISSED`) as a constant, checked against the `TourOutcome` type from `@outfiqe/types`. That package is types-only, so values are defined in the app.
- `constants/tourProgressQueryKey.ts` — the React Query key for the saved progress, shared by the read and write hooks.
- `utils/sidebarItemSelector.ts` — builds the `[data-sidebar-item-id="…"]` selector a step uses to point at a sidebar row.
- `api/toursApi.ts` + `api/toursSchemas.ts` — `GET /api/tours/me` and `PUT /api/tours/me/:tourKey`, with the response parsed through Zod.
- `hooks/useTourProgress.ts` — reads the saved progress (signed-in only).
- `hooks/useRecordTourOutcome.ts` — saves how a tour ended and writes it into the cache immediately.
- `utils/hasSeenTour.ts` — is there a saved outcome for this tour at this version or newer.
- `utils/withRecordedOutcome.ts` — the cache update used by the mutation.
- `index.ts` — the public entry: both tour components plus the label and each tour's replay link, for the sidebar and each overview header.

## Funnel

**User-facing:** a brand owner or approved creator signs in and lands on `/overview`. Once the numbers have loaded, their tour opens with a welcome card, then points at the figures row and at that account's own sidebar sections, ending with a closing card. Next and Back move between steps; the close button or Esc skips it. Either way it does not open by itself again, on any device. "Take the tour" — in the overview header and at the bottom of the sidebar — replays it whenever they like. On a phone the sidebar is hidden, so those steps appear as centred cards instead of pointing at anything.

**Technical:** `BrandOverview`/`CreatorOverview` → `BrandDashboardTour`/`CreatorDashboardTour` → `useTourController` → `useTourProgress` → `toursApi.listMine` → `GET /api/tours/me` (see `apps/api/src/modules/tours`). When a tour ends, `useTourController` → `useRecordTourOutcome` → `toursApi.recordOutcome` → `PUT /api/tours/me/:tourKey` with `{ version, outcome }`. The replay links go to `/overview?tour=<key>`; `useTourController` sees the query value, opens from step one, and clears it from the address bar with `window.history.replaceState` — not a router navigation — so the same link works again next time without a second server round trip (see rationale). Step targets are found by `data-sidebar-item-id` (set on every row by `@outfiqe/components`' sidebar) and `data-tour-anchor` (set on the figures row in each overview).

## Non-obvious rationale

- **Clearing the replay query param uses `window.history.replaceState`, not `router.replace`.** `/overview` is a Server Component that re-authenticates and re-fetches the dashboard's data on every visit (`requireDashboardSession` reads cookies, which forces dynamic rendering), so a router navigation there is a real, sometimes-slow round trip. The first click already needs one, to actually arrive with `?tour=…`; a second one immediately after, just to strip the query, added a redundant round trip that could resolve in either order relative to the first — occasionally leaving `?tour=…` visible in the address bar, and always making the click feel slow. A direct history mutation changes the address bar instantly with no navigation at all. This is the same fix already used elsewhere in this codebase for the same class of problem — see `creator-profile/components/CreatorProfile.tsx`'s `openPost`/`closePost`.
- **The tour version is a constant next to each tour's steps.** The server stores the version a user last saw. When a dashboard changes enough to need a new walkthrough, raise that tour's version constant and everyone with a lower saved version sees it once more. Nothing to migrate.
- **It never opens unless the saved progress loaded successfully.** If the request fails, showing the tour anyway would repeat it for people who have already seen it, so it stays closed. Skipping a tour once is a smaller problem than showing it over and over.
- **Closing is remembered in the cache before the server answers, and a failed save is silent.** The tour cannot pop back up during the same visit even if the save fails, and a failed save is not worth an error message. The cost is that a failed save means the tour can open once more on a later visit. The progress query is also set never to go stale, so refocusing the window cannot bring back old data mid-visit.
- **Replaying does not write anything when the current version was already seen.** It would only overwrite a saved outcome with the same information.
- **Each tour only mounts once its overview has loaded.** The figures row it points at is a different element while loading than when loaded, and its position is only measured when a step opens.
- **The replay link is a plain link with a query value, not shared state.** The overview header and the sidebar footer are in different parts of the page; a link needs no shared provider and also works from any other dashboard page.
- **The controller logic is shared, the content is not.** `useTourController` knows nothing about brands or creators — it only takes a tour key, a version, and whether the current account is eligible. Adding a third tour (for example, a CRM one) is a new steps file, a new `TourKey` value, a thin wrapper component, and a mount point — not a change to this hook.
