# @outfiqe/components

## Purpose

Composed, cross-app UI widgets that are more than a single design-system primitive but aren't
app-specific — the site/admin header bar, the collapsible sidebar nav, and the notification bell +
panel. Each app wires these into its own layout and supplies the app-local data (API client,
socket connection, route resolver); the widgets themselves own no routing or fetching beyond what's
passed in.

## Structure

- `header/` — `HeaderBar` and its condense-on-scroll behavior (`useHeaderCondense`), plus
  `useHeaderHeightVar` (publishes the rendered header height to the `--site-header-height` custom
  property so page content can offset itself under the sticky bar). `styles.ts` holds the two class
  sets the bar swaps between; `HeaderBar` itself is plain `<header>`/`<div>` — see rationale below.
- `sidebar/` — `Sidebar`, `SidebarSection`, `SidebarNavItemView`, `SidebarSkeleton` (the
  matching auth/nav-loading placeholder each app renders before its sidebar data is ready), and
  their active-trail/expanded-group/collapse state (`activeTrail.ts`, `useExpandedGroups.ts`,
  `useSidebarCollapse.ts`). The
  `SidebarNavigationAdapter` an app passes carries `pathname` + `isActive` and either lets the
  widget render a plain `<a>` that calls `navigate(href)` on click, or supplies a `LinkComponent`
  the widget renders instead (see rationale below).
- `kanban/` — `KanbanBoard<TCard>`, a generic pipeline board: `columns` + `cards` +
  `renderCard` + `onCardMove(cardId, toColumnId)`. Cards move two ways, both keyboard-accessible —
  native HTML5 drag-and-drop and a "Move to" `<select>` on every card — so it needs **no
  drag-and-drop library dependency** (a deliberate call for an internal-tool board; revisit if a
  richer DnD interaction is ever required). First consumer: `apps/admin`'s CRM Pipeline page.
- `notifications/` — the shared notification bell UI, reused by `apps/web`'s
  `SiteNotificationBell` and `apps/admin`'s `AdminNotificationBell` (each app supplies its own
  `NotificationsApi`, socket, and `type -> route` resolver — see those features' own READMEs):
  - `NotificationBell.tsx` — the header icon + unread badge + popover trigger. Owns its own
    `unreadCount` react-query fetch independent of the panel's queries below.
  - `NotificationPanel.tsx` — the open popover's list: infinite-scroll feed, mark-read/mark-all-read.
  - `NotificationRow.tsx` / `NotificationAvatar.tsx` — one notification row and its actor avatar
    (or avatar stack, for a grouped notification).
  - `NotificationPreferencesView.tsx` — the per-type mute toggle list.
  - `resolveNotificationMessage.ts` / `notificationTypeLabels.ts` / `formatNotificationTimestamp.ts`
    — pure formatting helpers: the row's display text, its type label, and its relative timestamp
    (`"2m"` / `"3h"` / `"Aug 20"`).
- `testing/setup.tsx` — vitest jsdom setup for this package's own component tests (`jest-dom`
  matchers, RTL `cleanup`, and a `ResizeObserver` stub). Unlike a plain stub, this one keeps a
  registry of the observer callbacks so a test can drive them: `triggerResizeObservers()` fires
  every live observer, `waitForAnimationFrame()` awaits the `requestAnimationFrame` those callbacks
  are coalesced into, and `stubElementHeight()` gives jsdom (which measures everything as `0`) a
  real height to report. Wired by `vitest.config.ts` (a single `unit` project); run with
  `pnpm --filter @outfiqe/components test`.

## Non-obvious rationale

- **`HeaderBar` no longer uses `framer-motion`, and this package no longer depends on it — the repo
  now has no `framer-motion` anywhere.** The condense/expand motion used to be two nested
  `motion.*` elements with `layout` and a spring, i.e. a FLIP animation driven by a per-frame
  `requestAnimationFrame` loop in JS. Everything that actually changes between the two states is a
  plain animatable CSS property — `max-width` (`max-w-7xl` ↔ `max-w-5xl`), `padding` on both the
  wrapper and the bar, plus the background/border/shadow the bar was already transitioning — so the
  motion is now a CSS `transition` the browser owns, in the same spirit as the `vaul` switch
  described in `design-system/README.md`. No library, no JS animation loop.
- **A transform-based FLIP would have been the wrong replacement here, despite being the direct
  analogue of what `framer-motion` was doing.** FLIP animates geometry with `scale`, which distorts
  everything inside the box — the logo and nav text would visibly squash during a 64rem ↔ 80rem
  width change. `framer-motion` hid that by counter-scaling children (which is why both the
  `<header>` and the inner bar had to be `motion` elements with `layout`). Transitioning the real
  layout properties avoids the distortion problem entirely rather than correcting for it.
- **`useHeaderCondense` still uses `useState`, deliberately.** `SiteHeader` doesn't only style on
  this flag — it _unmounts_ the secondary link nav when condensed and scales the logo, and a
  subtree cannot be unmounted by toggling a class from a ref. The state is also not a scroll-time
  cost: the hook writes `window.scrollY > threshold`, so React bails out of re-rendering while the
  boolean is unchanged and only re-renders on an actual threshold crossing — exactly when the DOM
  has to change anyway. The `requestAnimationFrame` throttle in that hook keeps the scroll listener
  itself off the main-thread critical path.
- **This package owns a vitest project now.** It previously had only a `lint` script and was tested
  transitively through the apps. Dropping `framer-motion` moved the header's condense motion into
  this package's own class sets and CSS transitions, and the height-var effect into a hook here, so
  that behaviour needed colocated tests rather than app-level coverage. Mirrors
  `packages/design-system`'s setup (same `unit` project shape, same 80% thresholds).
  `coverage.include` only lists files with colocated tests (`HeaderBar.tsx`,
  `useHeaderHeightVar.ts`, `NotificationBell.tsx`); widen it as more components get them.
- **`NotificationBell` sizes its icon from the trigger (`[&_svg]:size-6 lg:[&_svg]:size-5`), not from
  the `<Bell />` element.** A `size-*` class on an icon inside a design-system `Button` is dead —
  `Button`'s own `[&_svg]:size-4` is a higher-specificity descendant rule that wins. See
  `design-system/README.md` for the full explanation. The trigger is also `size-11` below `lg`
  (44px, the minimum comfortable touch target) and relaxes to the standard `size-10` on desktop.
- **`useHeaderHeightVar` is ref-only, with no state, on purpose.** It runs a `ResizeObserver` whose
  callback is `requestAnimationFrame`-coalesced and writes the measured height straight to a CSS
  custom property on `<html>`. Putting that number in React state would re-render the whole header
  subtree on every resize frame to produce a value only CSS consumes.

**`NotificationBell`'s `unreadCount` query is independent of `NotificationPanel`'s own feed query**,
even though both eventually read the same server state. They share a query key
(`NOTIFICATIONS_UNREAD_COUNT_QUERY_KEY`), so react-query dedupes the actual fetch — the split exists
so the badge count stays live and correct even while the panel itself is closed or unmounted, not
just while it's open.

**The sidebar's optional `LinkComponent` exists so an app can hand the widget its framework's own
link.** The default `<a onClick={navigate}>` path derives the active highlight purely from
`pathname`, so the highlight only moves once the router commits the new route — on Next's App
Router that waits for a server round-trip and feels laggy. When an adapter supplies `LinkComponent`,
`SidebarNavItemView` renders it instead (no `preventDefault`/`navigate`), passing the committed
active flags plus the resolved class tokens; the app-side component then owns prefetch and an
optimistic pending highlight. `apps/web`'s `DashboardSidebarLink` does exactly this with a
`next/link` wrapper plus `useLinkStatus`. `apps/admin` passes no `LinkComponent` and keeps the
plain-anchor path.
