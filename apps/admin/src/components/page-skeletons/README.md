# Page skeletons

## Purpose

The loading placeholder the admin shows while a page's code is still loading, shaped like the page
that is about to appear so nothing jumps when the real content arrives.

## Structure

- `RoutePendingSkeleton.tsx` — the router's default pending component; picks a skeleton from the URL being navigated to.
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
`resolvePageSkeletonKind` → the matching skeleton component. The outer `_authenticated` layout has
its own `pendingComponent` (the logo pulse) because there is no shell to put a skeleton inside yet.

## Non-obvious rationale

- The mapping is by URL, in one file, instead of a `pendingComponent` on each of the ~60 route files.
  A new page falls back to the generic skeleton until it is added to `resolvePageSkeletonKind.ts`.
- These skeletons only cover the wait for a page's code and route loader. Data loading inside a page
  (a table fetching rows) is that page's own loading state.
- The pending component reads `location.pathname` from router state, which is the destination while a
  navigation is pending.
