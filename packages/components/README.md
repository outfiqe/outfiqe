# @outfiqe/components

## Purpose

Composed, cross-app UI widgets that are more than a single design-system primitive but aren't
app-specific — the site/admin header bar, the collapsible sidebar nav, and the notification bell +
panel. Each app wires these into its own layout and supplies the app-local data (API client,
socket connection, route resolver); the widgets themselves own no routing or fetching beyond what's
passed in.

## Structure

- `header/` — `HeaderBar` and its condense-on-scroll behavior (`useHeaderCondense`).
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

## Non-obvious rationale

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
