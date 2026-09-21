# product-tour

## Purpose

A short guided walkthrough that shows a new brand owner where things live on their dashboard, one step at a time with Back / Next / Skip. It opens by itself the first time a brand owner reaches `/overview`, remembers per account (on the server) that it was seen, and can be replayed at any time.

## Structure

- `components/BrandDashboardTour.tsx` — decides whether the tour is open and feeds it the steps. Mounted by `brand-dashboard`'s `BrandOverview` once the overview has loaded. Renders the design-system `Tour` (`@outfiqe/design-system`), which knows nothing about brands or this content.
- `constants/brandDashboardTour.ts` — the tour's key and **version**, its eight steps (title, body, and which element each one points at), and the replay link (`/overview?tour=brand-dashboard`) and its label.
- `constants/tourProgressQueryKey.ts` — the React Query key for the saved progress, shared by the read and write hooks.
- `api/toursApi.ts` + `api/toursSchemas.ts` — `GET /api/tours/me` and `PUT /api/tours/me/:tourKey`, with the response parsed through Zod.
- `hooks/useTourProgress.ts` — reads the saved progress (signed-in only).
- `hooks/useRecordTourOutcome.ts` — saves how a tour ended and writes it into the cache immediately.
- `utils/hasSeenTour.ts` — is there a saved outcome for this tour at this version or newer.
- `utils/withRecordedOutcome.ts` — the cache update used by the mutation.
- `index.ts` — the public entry: the component plus the replay link and label the sidebar and overview header use.

## Funnel

**User-facing:** a brand owner signs in and lands on `/overview`. Once the numbers have loaded, the tour opens with a welcome card, then points at the figures row and at Products, Tag reviews, Orders, Wallet and Profile in the sidebar, and ends with a closing card. Next and Back move between steps; the close button or Esc skips it. Either way it does not open by itself again, on any device. "Take the tour" — in the overview header and at the bottom of the brand sidebar — replays it whenever they like. On a phone the sidebar is hidden, so those steps appear as centred cards instead of pointing at anything.

**Technical:** `BrandOverview` → `BrandDashboardTour` → `useTourProgress` → `toursApi.listMine` → `GET /api/tours/me` (see `apps/api/src/modules/tours`). When the tour ends, `useRecordTourOutcome` → `toursApi.recordOutcome` → `PUT /api/tours/me/brand-dashboard` with `{ version, outcome }`. The replay links go to `/overview?tour=brand-dashboard`; `BrandDashboardTour` sees the query value, opens from step one, and removes it from the URL so the same link works again next time. Step targets are found by `data-sidebar-item-id` (set on every row by `@outfiqe/components`' sidebar) and `data-tour-anchor` (set on the figures row in `BrandOverview`).

## Non-obvious rationale

- **The tour version is a constant next to the steps.** The server stores the version a user last saw. When the dashboard changes enough to need a new walkthrough, raise `BRAND_DASHBOARD_TOUR_VERSION` and everyone with a lower saved version sees the tour once more. Nothing to migrate.
- **It never opens unless the saved progress loaded successfully.** If the request fails, showing the tour anyway would repeat it for people who have already seen it, so it stays closed. Skipping a tour once is a smaller problem than showing it over and over.
- **Closing is remembered in the cache before the server answers, and a failed save is silent.** The tour cannot pop back up during the same visit even if the save fails, and a failed save is not worth an error message. The cost is that a failed save means the tour can open once more on a later visit. The progress query is also set never to go stale, so refocusing the window cannot bring back old data mid-visit.
- **Replaying does not write anything when the current version was already seen.** It would only overwrite a saved outcome with the same information.
- **The tour only mounts once the overview has loaded.** The figures row it points at is a different element while loading than when loaded, and its position is only measured when a step opens.
- **The replay link is a plain link with a query value, not shared state.** The overview header and the sidebar footer are in different parts of the page; a link needs no shared provider and also works from any other dashboard page.
- **Only the brand dashboard has a tour so far.** The `Tour` component is generic and `TourKey` (`@outfiqe/types`) is a list, so a creator or admin tour is a new steps file, a new key, and a mount point.
