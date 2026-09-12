# explore

## Purpose

The public social feed: browsing posts (looks), liking/saving/commenting, following creators, and viewing a single post in detail. Owns the post-card/post-detail UI that other features (`creator-profile`, `saved posts`) reuse rather than rebuild.

## Structure

- `components/ExploreFeed.tsx` — the `/explore` page: filter tabs (For You / Following / a trending tag), infinite-scroll feed, sidebar, and live updates via socket. Tab/layout state lives in the URL but is highlighted optimistically via `usePendingSelection` — see "Tab and layout switches highlight optimistically" below. Supports two layouts — List renders `PostCard`; Grid (the default) renders the lighter `PostGridCard` in a plain CSS grid (`grid-cols-2 xl:grid-cols-3`) — see "Grid layout is CSS grid, not multi-column" below. Its first page is server-rendered — see "First feed page is server-rendered" below.
- `components/PostCard.tsx` — one feed card (List layout): header, photo carousel, tagged-product pills, caption, like/comment/save row, and an inline expandable comments section.
- `components/PostGridCard.tsx` — one grid tile (Grid layout): just the image (with a stack icon if the post has multiple photos) and a static two-line clamped caption below it — no header/actions/comments and no interactive "see more", since tapping the tile opens the full `PostDetailModal` with the whole caption. The caption area holds a fixed two-line height so a short or missing caption never shifts the tiles below it. Deliberately lighter than `PostCard` so two columns fit comfortably on a phone screen; the tiles are laid out by a plain CSS `grid` (`ExploreFeed`), no JS layout pass and no `react-masonry-css`, unlike the richer-card masonry grid `MASONRY_BREAKPOINT_COLUMNS` used by `SavedPostsGrid`, which still collapses to 1 column on mobile because it renders full `PostCard`s. `EXPLORE_GRID_BREAKPOINT_COLUMNS` (`explore.constants.ts`) now only feeds `search`'s masonry.
- `components/PostDetailModal.tsx` — the modal opened when a post's image is clicked (from the feed, saved posts, or a creator's profile grid). Two-pane layout: a fixed photo pane on the left, and a scrollable pane on the right (creator header, tags, caption, actions, comments) — same shape as `PostCard`'s content, just side-by-side with the image instead of stacked below it.
- `components/PostCardHeader.tsx`, `PostCarousel.tsx`, `PostCarouselControls.tsx`, `PostCaption.tsx`, `PostActionsRow.tsx`, `PostTagPill.tsx`, `PostCommentsSection.tsx` — the building blocks shared by `PostCard` and `PostDetailModal`.
- `components/CommentThread.tsx` — one top-level comment plus its replies: the inline reply preview, "View N replies"/"Load more replies" expansion, the Reply toggle, and the reply composer. One instance per comment, each owning its own expand/collapse and pagination state via `useCommentReplies` — see "Real-time comments and replies" below.
- `components/SavedPostsGrid.tsx` — the saved-posts view: a masonry grid of `PostCard`s that also opens `PostDetailModal` on click.
- `components/AddPostButton.tsx` — floating action button that opens `creator-dashboard`'s `PostModal` (cross-feature import — this feature displays posts, `creator-dashboard` owns creating/editing them).
- `components/Sidebar.tsx`, `ExploreSidebarNav.tsx`, `HeaderBackdrop.tsx`, `FeedFilterTabs.tsx`, `PostCardSkeleton.tsx` — the rest of the feed page's chrome and loading states. `ExploreSidebarNav` is the desktop rail: the For You / Following / Trending tab buttons and the Grid / List view buttons (both prop-driven, highlighted from `ExploreFeed`'s optimistic `tab`/`layout`), plus a "Saved" `<Link>` to `/wishlist` that shows its own `useLinkStatus` pending state — see "Tab and layout switches highlight optimistically" below. `Sidebar`'s "Creators to follow" rail is a fixed-size slice (`SUGGESTED_CREATORS_LIMIT`, `apps/api/src/modules/follows/follow.constants.ts`) of the ranked suggestion pool (see `apps/api/src/modules/follows/README.md`); its "Find more" button opens `SuggestedCreatorsModal`.
- `components/SuggestedCreatorRow.tsx` — one suggested-creator row (avatar, name, follower count, Follow button), shared by the sidebar rail and `SuggestedCreatorsModal` so the two surfaces never drift in markup.
- `components/SuggestedCreatorsModal.tsx` — the expanded, scrollable "Creators to follow" modal opened from the sidebar's "Find more" button. Infinite-scrolls the same ranked pool the rail's first page comes from, via `useInfiniteSuggestedCreators` + the shared `useLoadMoreOnVisible` sentinel (same pattern as `BrandsGrid`/`ExploreFeed`).
- `api/exploreFeedApi.ts`, `exploreFeedSchemas.ts` — feed/comment/reply fetches and the `FeedPost`/`FeedComment`/`FeedCommentReply` shapes everything above is built on.
- `hooks/usePostCardState.ts` — the mutation/state bundle (`gated`, like/save/follow mutations, `useLookComments`) shared by `PostCard` and `PostDetailModal` so both stay in sync with the same query cache.
- `hooks/useLookComments.ts` — the top-level comments query for one post, the `comments:<lookId>` socket room subscription (joined only while the comments panel is open), live-append handling for `comment:created`/`comment:reply:created`, and the optimistic `submitComment` — see "Real-time comments and replies" below.
- `hooks/useCommentReplies.ts` — one comment thread's reply pagination (`useInfiniteCursorPage`) and the optimistic `submitReply`; instantiated per `CommentThread`, not shared across comments.
- `hooks/useInfiniteExploreFeed.ts`, `useInfiniteSavedPosts.ts`, `useLikeLook.ts`, `useSaveLook.ts`, `useFollowCreator.ts`, `useTrendingTags.ts`, `useSuggestedCreators.ts`, `useInfiniteSuggestedCreators.ts`, `useExploreAuthGate.ts`, `useExploreFeedSocket.ts` — one hook per query/mutation/concern; `useExploreAuthGate`'s `gated()` redirects an unauthenticated visitor to sign-in instead of letting them like/save/comment/reply/follow. `useSuggestedCreators` (unpaginated, `SUGGESTED_CREATORS_LIMIT`-sized) backs the sidebar rail; `useInfiniteSuggestedCreators` (cursor-paginated) backs the "Find more" modal — both call `GET /follows/suggested-creators`, just with/without a `cursor`.
- `hooks/useRecordLookView.ts` — fires `POST /creator-looks/:lookId/views` (gamification view-tracking, see `../../creator-looks/README.md`'s "View tracking" section on the API side) the first time a `PostCard` becomes at least half-visible in the viewport, then disconnects — a plain `IntersectionObserver`, same primitive `@/shared/hooks/useLoadMoreOnVisible.ts` uses for infinite scroll, but fire-once rather than fire-on-every-intersection.
- `utils/feedCacheUpdate.ts` — `patchPostInFeedCaches` / `patchCreatorInFeedCaches`, applying an optimistic/server like/save/follow patch to a post across **every** React Query cache it might be sitting in: the explore feed (`["explore-feed"]`), the saved grid (`["saved-posts"]`), a creator profile's own look grid (`["creator-looks", handle]`), look search results (`["look-search"]`), and a single deep-linked look (`usePublicLook`'s `["creator-looks", "public", lookId]`). It walks the `FEED_POST_QUERY_ROOTS` list and shape-guards each entry (infinite `FeedPage` vs. a bare `FeedPost` vs. anything else, e.g. the co-located `["creator-looks", "detail", id]` editor cache which it leaves alone). `cancelFeedPostQueries` cancels those same roots in the mutations' `onMutate`. See "A like/save/follow has to reach the post in every cache" below.
- `utils/commentCacheUpdate.ts` — the id-deduped cache operations `useLookComments`/`useCommentReplies` share: appending a new comment/reply exactly once regardless of whether it arrived via the submitter's own optimistic insert, the REST response, or the live socket echo; reverting an optimistic reply on failure.
- `utils/offlineActionTypes.ts` — the queue-action-type string each of like/save/follow enqueues and
  replays under, shared between the mutation hook and `offlineActionHandlers.ts` so the two can
  never drift apart.
- `utils/offlineQueueableToggle.ts` — `toggleWithOfflineQueue`, the one place that decides whether a
  like/save/follow runs for real now or gets queued for later — see "Liking, saving, and following
  work with no connection" below.
- `offlineActionHandlers.ts` — registers the real API call each queued like/save/follow replays
  through once the connection returns (`apps/web/src/features/pwa`'s generic queue processor calls
  these back by action type; see that module's README for the queue itself).
- `utils/lookPermalink.ts` — `lookPermalinkPath`, the one place that knows a look's shareable URL is
  `/creator/:handle?look=:id` — shared with `notifications`' `resolveNotificationHref` so the two can
  never point at a different shape for the same thing.
- `socketEvents.ts` — the client-side mirror of the API's `SOCKET_EVENTS`/payload shapes this feature listens for (`look:created`, `feed:sync:*`, `comments:*`, `comment:created`, `comment:reply:created`).

## Funnel

**User-facing:** anyone can browse `/explore`, switch tabs, and scroll the feed. Clicking a post's photo opens `PostDetailModal` with the same content as the card, laid out beside the image instead of below it. Liking/saving/following/commenting all prompt a sign-in redirect if the visitor isn't authenticated (`useExploreAuthGate`). Signed-in creators post via the floating `AddPostButton`.

**Technical:** `ExploreFeed`/`SavedPostsGrid` fetch pages via `useInfiniteExploreFeed`/`useInfiniteSavedPosts` → `exploreFeedApi` → `GET /explore/feed` / `GET /explore/saved`. `PostCard` and `PostDetailModal` both read their interactive state from `usePostCardState`, so liking/saving/commenting from either place updates the same React Query cache entries (`patchPostInFeedCaches`) and stays consistent across the feed, the saved grid, a creator profile's grid, look search, and any open detail modal — see "A like/save/follow has to reach the post in every cache". `useExploreFeedSocket` keeps the "N new looks" banner live by asking the server for a tab-scoped count (`FEED_SYNC_REQUEST`/`FEED_SYNC_RESULT`, backed by `creatorLookService.countNewSince`) rather than counting anything itself.

## Real-time comments and replies

**User-facing:** opening a post's comments panel shows top-level comments with up to two replies inline per comment; "View N replies" expands the rest, paginated. Anyone with the panel open sees new comments and replies land live, from anyone — no refresh, no polling. Posting a comment or reply appears immediately (optimistic), before the server confirms it.

**Technical:** `useLookComments(lookId, isOpen)` fetches `GET /creator-looks/:lookId/comments` and, while `isOpen`, joins the `comments:<lookId>` Socket.IO room (`comments:subscribe`/`comments:unsubscribe`, mirroring `../leaderboard`'s per-category room lifecycle on the API side — see `creator-looks/README.md`'s "Real-time comment replies"). `comment:created`/`comment:reply:created` events append directly into the `["look-comments", lookId]` query cache (and, if a thread happens to be expanded, into that comment's `["look-comment-replies", lookId, commentId]` infinite-query cache too) via `commentCacheUpdate.ts` — never a refetch, since the event already carries the full new row. `CommentThread` owns each comment's own reply pagination independently via `useCommentReplies`, using the shared `useInfiniteCursorPage` (`@outfiqe/hooks`) against `GET /creator-looks/:lookId/comments/:commentId/replies`.

**Every append is id-deduped, because both self-echo and redelivery are expected, not edge cases.** The submitting user's own socket is a member of the room it just broadcast to, so their own comment/reply arrives twice: once from the optimistic insert → REST response, and again from the live event. Separately, the API's Redis Streams consumer group is at-least-once, so a crash-before-ack can redeliver the same event later. `appendCommentIfNew`/`applyReplyToCommentCaches` (`utils/commentCacheUpdate.ts`) check the target cache for the id before inserting, so both cases are silent no-ops rather than a duplicate row in the UI.

**Optimistic replies revert precisely, not with a full refetch.** A failed `submitReply` calls `revertReplyOptimisticInsert`, which removes only the temp-id entry from both the parent comment's `previewReplies` and the expanded infinite-replies cache (and decrements `replyCount`, floored at zero) — chosen over invalidating the whole comments query so a failed reply doesn't also discard other live updates that landed in the meantime.

## A like/save/follow has to reach the post in every cache

`PostCard` and `PostDetailModal` render their like/save/follow state straight from the `post` prop —
they hold no local state — so the icon only flips when the query cache that `post` came from is
patched and a new object is handed down. `patchPostInFeedCaches` used to touch only `["explore-feed"]`
and `["saved-posts"]`. The same `PostDetailModal` is also opened from a creator profile
(`detailPost` derived from `["creator-looks", handle]`, or `usePublicLook`'s
`["creator-looks", "public", lookId]` for a look not in the grid) and from look search
(`["look-search", q]`). Liking a post there hit the API but never patched the cache the modal was
reading, so the flame never moved and every further click re-sent the same stale `liked` value —
"works in the feed, dead everywhere else". The fix is to patch **every** `FEED_POST_QUERY_ROOTS`
cache (shape-guarded), and `cancelFeedPostQueries` cancels the same set so an in-flight refetch
can't clobber the optimistic patch. `useFollowCreator` also gained an `onSuccess` that reconciles
`isFollowingCreator` to the server's `following` value, matching `useLikeLook`/`useSaveLook`.

## Liking, saving, and following work with no connection

**User-facing:** tapping like, save, or follow shows the change immediately, whether or not there
is a connection. Offline, it is remembered and sent for real the moment the connection comes back —
nobody has to notice, retry, or do anything differently.

**Technical:** each of `useLikeLook`/`useSaveLook`/`useFollowCreator`'s `mutationFn` calls
`toggleWithOfflineQueue` instead of the real API function directly. Online, it's a pass-through.
Offline, it calls `enqueueOfflineAction` (`apps/web/src/features/pwa`) with the action's type and a
key built from the item's id — so liking the same look twice while offline collapses into one
queued action, not two — and resolves with `null` instead of a real server response, which
`onSuccess` treats as "nothing to reconcile yet" and leaves the optimistic `onMutate` patch exactly
as it was. `offlineActionHandlers.ts` registers the real API calls the queue replays these through
once back online; it is imported once, for its side effect, from `app/providers.tsx` — not from
inside the hooks themselves, because a hook's module only loads on a page that actually renders it,
and the queue needs every handler registered before the very first drain, regardless of which page
happened to load first this session.

## Sharing a look, a profile, or a product

**User-facing:** every look, creator profile, and product has a Share button. On a phone, it opens
the same share sheet as any other app — Messages, WhatsApp, whatever's installed. On a browser with
no share sheet, it copies the link instead and says so.

**Technical:** `usePostCardState`'s `shareLook` builds the payload — a title, the caption as the
share text (falling back to a generic line when there is none), and an absolute URL built from
`lookPermalinkPath` — and hands it to `apps/web/src/features/pwa`'s `shareOrCopyLink`, which is the
one function actually deciding share-sheet-or-clipboard; see that module's README for how. Creator
profiles and products build the same kind of payload inline in `CreatorProfile.tsx`/`ProductDetail.tsx`
rather than through a shared hook, since each only needs it in exactly one place — `shareLook` earns
its own function by being needed identically from both `PostCard` and `PostDetailModal`.

## Non-obvious rationale

**Grid layout is CSS grid, not multi-column.** `PostGridCard` tiles are fixed-size (a `4/5` image plus a two-line-clamped caption), so there is no masonry to do. The grid used CSS `columns` (`columns-2 xl:columns-3`), whose default `column-fill: balance` distributes items to equalize column heights — but with `break-inside-avoid` tiles it can only cut on tile boundaries, so a modest feed (e.g. the `following` tab, which is usually far shorter than For You) balanced to uneven column counts and left a tall empty gap in the last column. It also reads top-of-column-1 to bottom-of-column-1 first, wrong for a relevance/recency-ordered feed. `grid grid-cols-2 xl:grid-cols-3` fills left-to-right in source order, rows are exactly as tall as the (near-uniform) tiles, and item count no longer affects the shape. `SavedPostsGrid`/`search` keep `react-masonry-css` because those render genuinely variable-height `PostCard`s.

**First feed page is server-rendered.** `ExploreFeed` is a client component (URL-driven tabs, infinite
scroll, socket, optimistic mutations), so the feed — including the LCP image — used to paint only
after the JS bundle downloaded, hydrated, and the feed query resolved. `app/explore/page.tsx` now
`prefetchInfiniteQuery`s page one of the default/`for_you` (or `trending`) tab on the server via
`api/serverExploreFeed.ts` and hands it down through a `HydrationBoundary`, so the grid renders in
the initial HTML and the first few images carry `eager`. The server fetch is anonymous and cached
(`revalidateSeconds: 30`) — every visitor's first paint shares it; a signed-in client still hydrates
and refetches its personalised feed. `/creator-looks/feed` is `optionalAuth`, so the anonymous fetch
is a valid feed rather than an error. Reading `searchParams` makes the page dynamic (it is no longer
in the prerendered browse-shell set), but the 30s fetch cache keeps origin load flat.

**Tab and layout switches highlight optimistically, via `usePendingSelection`.** `tab`/`layout` live
in the URL (`?tab=`/`?layout=`), and `app/explore/page.tsx` reads `searchParams`, so a `router.replace`
to a new tab is a full RSC round-trip — the highlight (derived from `useSearchParams`) would otherwise
only move once that commits, ~half a second of dead click on a slow connection. `ExploreFeed` wraps
each of `committedTab`/`committedLayout` in `@/shared/hooks/usePendingSelection` (keyed on the
committed value), so `markPending(next)` immediately makes `next` the effective value everywhere —
the sidebar/tab-strip highlight, the feed query key, the socket sync, the auth gate — and it
reconciles the moment `useSearchParams` catches up (or after the hook's 3s stuck-timeout). This is
the same hook and pattern `features/shop/components/ShopResults.tsx` uses for its type filter. The
sidebar's "Saved" item is a real `<Link>` to `/wishlist`, not a same-page toggle, so it can't use
`usePendingSelection`; it takes the `<Link>`-native route: a `useLinkStatus()` child that highlights
the row and pulses a dot while the navigation is in flight, matching `ShopExploreToggle` and
`DashboardSidebarLink`.

**The feed's skeleton gate no longer waits on client auth.** It previously showed a skeleton until
`useAuth` resolved, which threw away the server-rendered feed on every load. It now renders whatever
posts are in cache immediately; the skeleton only shows for a genuinely empty, still-loading feed
(or the `following` tab before auth resolves). `following` stays client-only — its feed is
per-user and not worth server-rendering for a tab most first-time visitors never open.

**`PostDetailModal`, `AddPostButton`, `Sidebar` and the List-layout `PostCard` are `next/dynamic`
imports.** None of them is on the first-paint path for the default Grid feed — the modal only mounts
on a tile click, the FAB opens `creator-dashboard`'s heavy `PostModal`, the right rail is
client-only data, and `PostCard` only renders in the non-default List layout — so keeping them out
of the route's initial chunk is worth the extra request when they are actually needed.

**`AddPostButton` sits higher on mobile when the user is signed in.** Below `sm` the global
`FloatingChatLauncher` bubble (`messaging`, mounted in `app/providers.tsx`) sits just above the
`MobileTabBar` at `bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4`, so on `/explore`
and creator profiles this FAB stacks on top of it at
`bottom-[calc(9rem+env(safe-area-inset-bottom))]` (a 48px launcher plus an ~8px gap); signed-out
users, who never see the launcher, take the launcher's own slot. Both offsets add
`env(safe-area-inset-bottom)` so the pair clears the tab bar (which does the same) on a notched
phone. On mobile both buttons are `size-12` circles for a tidy cluster; at `sm` and up the
launcher moves to `bottom-6` and this FAB becomes the `Post` pill, so the stacking only matters
below `sm`.

**Like/save/follow all set `networkMode: "always"`, and that is what makes queueing them possible
at all — not an unrelated hardening.** React Query's default `networkMode: "online"` pauses a
mutation started while offline before ever calling `mutationFn` — so without this, `mutationFn`'s
own offline check inside `toggleWithOfflineQueue` would simply never run, and the mutation would
just sit paused instead of being queued. `"always"` hands control to the mutation function itself,
which is exactly where the decision needs to be made.

**`useSuggestedCreators` and `useInfiniteSuggestedCreators` use query keys `["suggested-creators"]`
and `["suggested-creators", "infinite"]` on purpose — not two unrelated names.** `useFollowCreator`
invalidates `["suggested-creators"]` on every follow/unfollow; React Query's default (non-`exact`)
invalidation matches by key _prefix_, so that one invalidation call refreshes both the sidebar rail
and, if open, the "Find more" modal's infinite list — a creator who was just followed disappears
from both without either hook needing to know the other exists.

**`useExploreFeedSocket` re-syncs on tab change, and never counts `look:created` pushes itself.** The server's `FEED_SYNC_REQUEST` handler computes a count that's genuinely scoped to the open tab (follow graph for Following, hashtag for a tag tab, trending pool for Trending/For You — see `creator-looks/README.md`), so it's re-emitted on every `tab` change, not just on socket `connect`, and the count is reset to `0` immediately on switch so it never shows a number left over from a different tab. The `look:created` broadcast is intentionally coarse — every connected client gets it regardless of what tab they're viewing, since the server doesn't know per-socket which posts are relevant to which viewer's Following/hashtag filter. So the client treats it only as a "something changed, go re-ask" signal (debounced via `LOOK_CREATED_RESYNC_DEBOUNCE_MS` so a burst of posts coalesces into one request) rather than incrementing a local counter — the server's tab-aware `countNewSince` stays the single source of truth for what's actually new to _this_ viewer on _this_ tab.

**The "N new looks" banner is deliberately disabled on For You/Trending (`isLiveSyncTab`).** Those two tabs are trend-scored, not chronological — a just-created look has zero engagement and won't enter the ranked pool until the next `explore-trending-scoring` job runs (every 30 min, see `creator-looks/README.md`). `look:created` fires the instant a post is created, so a live banner there would promise "click to view" on content the ranked query can't actually surface yet, making the button look broken. Following and hashtag tabs don't have this problem — they're plain `createdAt desc` queries, so a new post is visible the moment it exists — so only those tabs request/accept a live sync.

**For You shows a standing "gets more personalized" hint, not a conditional one.** `scorePersonalized`'s follow/engagement/hashtag boosts (`creator-looks/README.md`) are a genuine no-op multiplier for a viewer with no signal yet, so For You and Trending can look identical to a new or logged-out viewer — a real question users asked, not a bug. Telling them apart correctly (does _this_ viewer have any real signal yet) needs data this component doesn't have client-side without a new fetch, so the hint runs off `tab === EXPLORE_TAB.FOR_YOU` alone rather than trying to detect "no signal yet" — it stays visible even once personalization is genuinely active, which is an acceptable trade for not adding a fetch just to decide whether to show one line of copy. `ExploreFeed.tsx` has no test file at all (heavy hook surface — auth gate, socket, infinite query, router — see the "no test yet for `useRecordLookView`" note below for the standing pattern of documenting rather than silently skipping), so this is an inline change with no new coverage.

**`useRecordLookView` only wires into `PostCard`, not `PostGridCard`/`PostDetailModal`.** `PostCard` is what actually renders in the main scrollable feed (List layout) and the saved-posts grid — the two surfaces someone genuinely scrolls past dozens of posts in. `PostGridCard` (Grid layout) is a lighter tile that opens `PostDetailModal` on click; wiring view-tracking into the grid tile too would double-count the same visit once for scrolling past the tile and again for opening the modal, so only the one canonical "a person had this post in front of them" surface reports a view. The hook itself is fully general (`lookId` + an `enabled` flag) if a future surface genuinely needs it. It skips firing entirely for the viewer's own post (`!isOwnPost`, from the same `usePostCardState` flag `PostCardHeader` already uses) purely to avoid a wasted network call — the backend's `recordView` already excludes self-views authoritatively (see `creator-looks/README.md`), so this is a client-side optimization, not the actual guarantee.

**Follow-up: no test yet for `useRecordLookView`.** Neither this hook nor its sibling `useLoadMoreOnVisible` (`@/shared/hooks`) has a unit test — `IntersectionObserver` isn't implemented by jsdom, and no test in this codebase currently mocks it, so adding one here would be introducing a first-of-its-kind test harness rather than following an established pattern. Verified instead via a live end-to-end pass (real feed, real scroll, confirmed the request fires once per post and `CreatorLookView`/`viewCount` land correctly — see `creator-looks/README.md`'s "View tracking" section). Worth circling back to add a shared `IntersectionObserver` mock and cover both hooks together.

**Every Follow button in this feature is now `disabled` while its toggle is in flight, matching Like and Save.** `PostCardHeader`, and `SuggestedCreatorRow` (used by both `Sidebar`'s "Creators to follow" rail and `SuggestedCreatorsModal`'s "Find more" list) were all missing this guard — a rapid double-tap could fire two overlapping `follow`/`unfollow` mutations before React re-rendered with the first one's optimistic state, both still reading the same stale closure. The backend's `follow`/`unfollow` are genuinely idempotent (`follow.repository.ts` checks `findUnique` inside the transaction before writing, so a duplicate call returns the existing state rather than erroring or double-counting), so this was never a data-corruption risk — but it was a real, avoidable source of duplicate network calls and an inconsistency with the rest of each row. `PostCard`/`PostDetailModal` thread `followMutation.isPending` through as `isFollowToggling` the same way `isLiking`/`isSaving` already flow to `PostActionsRow`; `Sidebar`/`SuggestedCreatorsModal` thread it through as `isFollowPending` — `SuggestedCreatorRow` already accepted that prop, it just was never passed. Note this guard is shared across every row in a suggested-creators list at once (one `useFollowCreator()` mutation per list, not per row), so following one creator briefly disables the others too — an acceptable, pre-existing trade-off of that single-mutation-per-list design, not something newly introduced here.

**`PostDetailModal` intentionally does not reuse `PostCard` directly.** Both are built from the same sub-components (`PostCardHeader`, `PostCarousel`, `PostActionsRow`, `PostTagPill`, `PostCommentsSection`) and the same `usePostCardState`, but `PostCard` is a page-flow block (header on top, image, then content stacked below) while `PostDetailModal` is a two-pane focused view (fixed image pane beside a scrollable content pane, sized like `creator-dashboard`'s `PostModal`/`MediaFormShell`). The detail modal was reshaped this way specifically so the caption and like/comment/save row are visible immediately next to the image — the previous single-column, page-scrolling layout let a tall image push that content below the fold with no visual hint that there was more to scroll to.
