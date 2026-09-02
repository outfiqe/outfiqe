# platform-nav-access (apps/admin)

## Purpose

The co-founder-only "Navigation access" screen: a per-item switch list for the platform navbar
plus a co-founder roster (add/remove, 4-cap). Backs the `/api/platform/nav-access` endpoints in
`apps/api/src/modules/platform-nav-access`.

## Structure

- `api.ts` — `platformNavAccessApi` (`getOverview`, `listCandidates`, `setHiddenNavKeys`,
  `promoteCoFounder`, `demoteCoFounder`), thin `apiClient` calls + Zod `.parse`.
- `schemas.ts` — Zod mirrors of the responses. `hiddenNavKeys` is parsed as `string[]` (not a
  strict enum) so an unknown key from the server never rejects the whole payload.
- `PlatformNavAccessPage.tsx` — the screen. Renders a non-co-founder notice when
  `useAuth().state.user.isCoFounder` is false (the real gate is the API + the sidebar hiding the
  nav item). `NAV_KEY_LABELS` is the local key→label map; the `platform-nav-access` key itself is
  never listed as toggleable.

## Funnel

Component → `platformNavAccessApi` → `/api/platform/nav-access*`. Toggling a switch rebuilds the
`hiddenNavKeys` set and `PUT`s the whole list; the roster add/remove `POST`/`DELETE`s a
membership id from `listCandidates`. All mutations invalidate `["platform-nav-access"]` (and the
candidates query) so the list re-renders from the server.

## Non-obvious rationale

- The route (`routes/_authenticated.platform.nav-access.index.tsx`) is a plain authenticated
  route — it is not co-founder-gated at the router level. The sidebar only shows the entry to
  co-founders (`coFounderOnly` on the nav item), the page renders a notice otherwise, and every
  write endpoint is `requireCoFounder` server-side, so a non-co-founder who types the URL sees
  nothing actionable.
- `NAV_KEY_LABELS` duplicates the labels in `AdminSidebar.tsx`'s `PLATFORM_NAV_ITEMS`. Keep the
  two in sync by hand — the shared contract in `@outfiqe/types` is the keys only, not the
  display strings (which carry icons and live with the sidebar).
