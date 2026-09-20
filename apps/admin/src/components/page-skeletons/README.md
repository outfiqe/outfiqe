# Page skeletons

## Purpose

The loading placeholder the admin shows while a page's code is still loading, shaped like the page
that is about to appear so nothing jumps when the real content arrives.

## Structure

- `RoutePendingSkeleton.tsx` — the router's default pending component; picks a skeleton from the URL being navigated to.
- `resolveCrmRouteSkeleton.ts` — pure mapping from a CRM pathname to the key of that page's own skeleton (`features/crm/skeletons.tsx`); `RoutePendingSkeleton` checks it before the layout kinds below.
- `resolvePageSkeletonKind.ts` — pure mapping from a pathname to one of five layout kinds (dashboard, list, kanban, detail-form, generic).
- `DashboardPageSkeleton.tsx`, `ListPageSkeleton.tsx`, `KanbanPageSkeleton.tsx`, `DetailFormPageSkeleton.tsx` — one skeleton per layout kind.
- `ShimmerBlock.tsx` — the design-system `Skeleton` with the admin shimmer instead of the pulse (the shimmer styles live in `src/index.css`).
- `../PagePendingSkeleton.tsx` — the generic fallback for pages that fit no layout kind.

## Funnel

**User-facing:** a person clicks a link inside the admin. If the next page takes longer than a moment
to load, the content area (sidebar and header stay put) shows placeholder blocks arranged like that
page — filter chips and card rows for a list, stat cards for an overview, columns for the pipeline,
form sections for a detail page — shimmering until the real page replaces them.

**Technical:** router navigation → pending match → `RoutePendingSkeleton` (set as
`defaultPendingComponent` in `main.tsx`) → `useRouterState` reads the pathname being navigated to →
`resolvePageSkeletonKind` → the matching skeleton component. The outer `_authenticated` layout renders
nothing while it loads: the page loader (below) is still covering the screen, and there is no shell to
put a skeleton inside yet.

## Non-obvious rationale

- The mapping is by URL, in one file, instead of a `pendingComponent` on each of the ~60 route files.
  A new page falls back to the generic skeleton until it is added to `resolvePageSkeletonKind.ts`.
- These skeletons only cover the wait for a page's code and route loader. Data loading inside a page
  (a table fetching rows) is that page's own loading state.
- The pending component reads `location.pathname` from router state, which is the destination while a
  navigation is pending.

## Loading states inside a page

Once a page's code has loaded, each list, table or card shows its own placeholder while its data
loads. Those placeholders are built from the real content's own markup so nothing moves when the
data arrives:

- **Same wrapper, placeholder contents.** A skeleton row reuses the real row's border, padding and
  layout classes and puts placeholder bars (sized to the title, text lines, badges and buttons) where
  the text goes. Static text — headings, column headers, card titles — is rendered for real, not
  as a bar.
- **Shared pieces** in `apps/admin/src/components/`: `CardRowSkeleton` (title + badge, text lines,
  action buttons, optional thumbnail or chip row), `ActionRowSkeleton` (one text block + buttons),
  `ReorderRowSkeleton` (drag handle, move arrows, thumbnail), `TableSkeleton` (real headers +
  placeholder rows) and, in `@outfiqe/design-system`, `StatCardSkeleton` and `Table`'s `isLoading`.
- **Page-specific skeletons** live in the page's own file (or a `skeletons.tsx` next to it, as in
  `features/gamification`) when the real layout is unique to that page.
- **CRM pages have their own route skeleton.** While a CRM page's code loads, the placeholder shows
  that page's real heading, description, filter controls and table headers (from
  `features/crm/crmPageContent.ts`) with placeholder rows, instead of the generic list or dashboard
  blocks. A new CRM page is added there and to `resolveCrmRouteSkeleton.ts`.
- **Left generic on purpose:** the CRM home page (its content depends on the viewer's permissions,
  which are unknown until the organization loads) and the typeahead dropdown option rows, which
  already match the option height.

## One loader from first paint to the dashboard

The pulsing logo lives in `index.html`, outside the React root, so React never wipes it. It stays up
through the script download, the session check and the layout load, and is removed
(`lib/bootLoader.ts`) by the first thing that renders real content: `AppShell` for signed-in pages,
or the invite-registration and not-found pages, which have no shell. `ProtectedRoute` and the
`_authenticated` layout render nothing while they wait, so there is no second logo screen. A 15 second
timer removes the loader anyway, so a page that fails to mount is not covered forever.
