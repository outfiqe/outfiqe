# explore

## Purpose

The public social feed: browsing posts (looks), liking/saving/commenting, following creators, and viewing a single post in detail. Owns the post-card/post-detail UI that other features (`creator-profile`, `saved posts`) reuse rather than rebuild.

## Structure

- `components/ExploreFeed.tsx` — the `/explore` page: filter tabs (For You / Following / a trending tag), infinite-scroll feed, sidebar, and live updates via socket. Supports two layouts — List renders `PostCard`; Grid renders the lighter `PostGridCard` in a Pinterest-style masonry.
- `components/PostCard.tsx` — one feed card (List layout): header, photo carousel, tagged-product pills, caption, like/comment/save row, and an inline expandable comments section.
- `components/PostGridCard.tsx` — one grid tile (Grid layout): just the image (with a stack icon if the post has multiple photos) and a truncated caption below it via `PostCaption` — no header/actions/comments, since tapping it opens the full `PostDetailModal`. Deliberately lighter than `PostCard` so two columns fit comfortably on a phone screen; `EXPLORE_GRID_BREAKPOINT_COLUMNS` (`explore.constants.ts`) never drops below 2 columns, unlike the richer-card masonry `MASONRY_BREAKPOINT_COLUMNS` used by `SavedPostsGrid`, which still collapses to 1 column on mobile because it renders full `PostCard`s.
- `components/PostDetailModal.tsx` — the modal opened when a post's image is clicked (from the feed, saved posts, or a creator's profile grid). Two-pane layout: a fixed photo pane on the left, and a scrollable pane on the right (creator header, tags, caption, actions, comments) — same shape as `PostCard`'s content, just side-by-side with the image instead of stacked below it.
- `components/PostCardHeader.tsx`, `PostCarousel.tsx`, `PostCarouselControls.tsx`, `PostCaption.tsx`, `PostActionsRow.tsx`, `PostTagPill.tsx`, `PostCommentsSection.tsx` — the building blocks shared by `PostCard` and `PostDetailModal`.
- `components/CommentThread.tsx` — one top-level comment plus its replies: the inline reply preview, "View N replies"/"Load more replies" expansion, the Reply toggle, and the reply composer. One instance per comment, each owning its own expand/collapse and pagination state via `useCommentReplies` — see "Real-time comments and replies" below.
- `components/SavedPostsGrid.tsx` — the saved-posts view: a masonry grid of `PostCard`s that also opens `PostDetailModal` on click.
- `components/AddPostButton.tsx` — floating action button that opens `creator-dashboard`'s `PostModal` (cross-feature import — this feature displays posts, `creator-dashboard` owns creating/editing them).
- `components/Sidebar.tsx`, `ExploreSidebarNav.tsx`, `HeaderBackdrop.tsx`, `FeedFilterTabs.tsx`, `PostCardSkeleton.tsx` — the rest of the feed page's chrome and loading states. `Sidebar`'s "Creators to follow" rail is a fixed-size slice (`SUGGESTED_CREATORS_LIMIT`, `apps/api/src/modules/follows/follow.constants.ts`) of the ranked suggestion pool (see `apps/api/src/modules/follows/README.md`); its "Find more" button opens `SuggestedCreatorsModal`.
- `components/SuggestedCreatorRow.tsx` — one suggested-creator row (avatar, name, follower count, Follow button), shared by the sidebar rail and `SuggestedCreatorsModal` so the two surfaces never drift in markup.
- `components/SuggestedCreatorsModal.tsx` — the expanded, scrollable "Creators to follow" modal opened from the sidebar's "Find more" button. Infinite-scrolls the same ranked pool the rail's first page comes from, via `useInfiniteSuggestedCreators` + the shared `useLoadMoreOnVisible` sentinel (same pattern as `BrandsGrid`/`ExploreFeed`).
- `api/exploreFeedApi.ts`, `exploreFeedSchemas.ts` — feed/comment/reply fetches and the `FeedPost`/`FeedComment`/`FeedCommentReply` shapes everything above is built on.
- `hooks/usePostCardState.ts` — the mutation/state bundle (`gated`, like/save/follow mutations, `useLookComments`) shared by `PostCard` and `PostDetailModal` so both stay in sync with the same query cache.
- `hooks/useLookComments.ts` — the top-level comments query for one post, the `comments:<lookId>` socket room subscription (joined only while the comments panel is open), live-append handling for `comment:created`/`comment:reply:created`, and the optimistic `submitComment` — see "Real-time comments and replies" below.
- `hooks/useCommentReplies.ts` — one comment thread's reply pagination (`useInfiniteCursorPage`) and the optimistic `submitReply`; instantiated per `CommentThread`, not shared across comments.
- `hooks/useInfiniteExploreFeed.ts`, `useInfiniteSavedPosts.ts`, `useLikeLook.ts`, `useSaveLook.ts`, `useFollowCreator.ts`, `useTrendingTags.ts`, `useSuggestedCreators.ts`, `useInfiniteSuggestedCreators.ts`, `useExploreAuthGate.ts`, `useExploreFeedSocket.ts` — one hook per query/mutation/concern; `useExploreAuthGate`'s `gated()` redirects an unauthenticated visitor to sign-in instead of letting them like/save/comment/reply/follow. `useSuggestedCreators` (unpaginated, `SUGGESTED_CREATORS_LIMIT`-sized) backs the sidebar rail; `useInfiniteSuggestedCreators` (cursor-paginated) backs the "Find more" modal — both call `GET /follows/suggested-creators`, just with/without a `cursor`.
- `hooks/useRecordLookView.ts` — fires `POST /creator-looks/:lookId/views` (gamification view-tracking, see `../../creator-looks/README.md`'s "View tracking" section on the API side) the first time a `PostCard` becomes at least half-visible in the viewport, then disconnects — a plain `IntersectionObserver`, same primitive `@/shared/hooks/useLoadMoreOnVisible.ts` uses for infinite scroll, but fire-once rather than fire-on-every-intersection.
- `utils/feedCacheUpdate.ts` — `patchPostInFeedCaches`, applying an optimistic/server patch to a post across every query cache it might currently be sitting in (feed, saved grid, single-post views).
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
- `socketEvents.ts` — the client-side mirror of the API's `SOCKET_EVENTS`/payload shapes this feature listens for (`look:created`, `feed:sync:*`, `comments:*`, `comment:created`, `comment:reply:created`).

## Funnel

**User-facing:** anyone can browse `/explore`, switch tabs, and scroll the feed. Clicking a post's photo opens `PostDetailModal` with the same content as the card, laid out beside the image instead of below it. Liking/saving/following/commenting all prompt a sign-in redirect if the visitor isn't authenticated (`useExploreAuthGate`). Signed-in creators post via the floating `AddPostButton`.

**Technical:** `ExploreFeed`/`SavedPostsGrid` fetch pages via `useInfiniteExploreFeed`/`useInfiniteSavedPosts` → `exploreFeedApi` → `GET /explore/feed` / `GET /explore/saved`. `PostCard` and `PostDetailModal` both read their interactive state from `usePostCardState`, so liking/saving/commenting from either place updates the same React Query cache entries (`patchPostInFeedCaches`) and stays consistent across the feed, saved grid, and any open detail modal. `useExploreFeedSocket` keeps the "N new looks" banner live by asking the server for a tab-scoped count (`FEED_SYNC_REQUEST`/`FEED_SYNC_RESULT`, backed by `creatorLookService.countNewSince`) rather than counting anything itself.

## Real-time comments and replies

**User-facing:** opening a post's comments panel shows top-level comments with up to two replies inline per comment; "View N replies" expands the rest, paginated. Anyone with the panel open sees new comments and replies land live, from anyone — no refresh, no polling. Posting a comment or reply appears immediately (optimistic), before the server confirms it.

**Technical:** `useLookComments(lookId, isOpen)` fetches `GET /creator-looks/:lookId/comments` and, while `isOpen`, joins the `comments:<lookId>` Socket.IO room (`comments:subscribe`/`comments:unsubscribe`, mirroring `../leaderboard`'s per-category room lifecycle on the API side — see `creator-looks/README.md`'s "Real-time comment replies"). `comment:created`/`comment:reply:created` events append directly into the `["look-comments", lookId]` query cache (and, if a thread happens to be expanded, into that comment's `["look-comment-replies", lookId, commentId]` infinite-query cache too) via `commentCacheUpdate.ts` — never a refetch, since the event already carries the full new row. `CommentThread` owns each comment's own reply pagination independently via `useCommentReplies`, using the shared `useInfiniteCursorPage` (`@outfiqe/hooks`) against `GET /creator-looks/:lookId/comments/:commentId/replies`.

**Every append is id-deduped, because both self-echo and redelivery are expected, not edge cases.** The submitting user's own socket is a member of the room it just broadcast to, so their own comment/reply arrives twice: once from the optimistic insert → REST response, and again from the live event. Separately, the API's Redis Streams consumer group is at-least-once, so a crash-before-ack can redeliver the same event later. `appendCommentIfNew`/`applyReplyToCommentCaches` (`utils/commentCacheUpdate.ts`) check the target cache for the id before inserting, so both cases are silent no-ops rather than a duplicate row in the UI.

**Optimistic replies revert precisely, not with a full refetch.** A failed `submitReply` calls `revertReplyOptimisticInsert`, which removes only the temp-id entry from both the parent comment's `previewReplies` and the expanded infinite-replies cache (and decrements `replyCount`, floored at zero) — chosen over invalidating the whole comments query so a failed reply doesn't also discard other live updates that landed in the meantime.

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

## Non-obvious rationale

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

**`useRecordLookView` only wires into `PostCard`, not `PostGridCard`/`PostDetailModal`.** `PostCard` is what actually renders in the main scrollable feed (List layout) and the saved-posts grid — the two surfaces someone genuinely scrolls past dozens of posts in. `PostGridCard` (Grid layout) is a lighter tile that opens `PostDetailModal` on click; wiring view-tracking into the grid tile too would double-count the same visit once for scrolling past the tile and again for opening the modal, so only the one canonical "a person had this post in front of them" surface reports a view. The hook itself is fully general (`lookId` + an `enabled` flag) if a future surface genuinely needs it. It skips firing entirely for the viewer's own post (`!isOwnPost`, from the same `usePostCardState` flag `PostCardHeader` already uses) purely to avoid a wasted network call — the backend's `recordView` already excludes self-views authoritatively (see `creator-looks/README.md`), so this is a client-side optimization, not the actual guarantee.

**Follow-up: no test yet for `useRecordLookView`.** Neither this hook nor its sibling `useLoadMoreOnVisible` (`@/shared/hooks`) has a unit test — `IntersectionObserver` isn't implemented by jsdom, and no test in this codebase currently mocks it, so adding one here would be introducing a first-of-its-kind test harness rather than following an established pattern. Verified instead via a live end-to-end pass (real feed, real scroll, confirmed the request fires once per post and `CreatorLookView`/`viewCount` land correctly — see `creator-looks/README.md`'s "View tracking" section). Worth circling back to add a shared `IntersectionObserver` mock and cover both hooks together.

**`PostDetailModal` intentionally does not reuse `PostCard` directly.** Both are built from the same sub-components (`PostCardHeader`, `PostCarousel`, `PostActionsRow`, `PostTagPill`, `PostCommentsSection`) and the same `usePostCardState`, but `PostCard` is a page-flow block (header on top, image, then content stacked below) while `PostDetailModal` is a two-pane focused view (fixed image pane beside a scrollable content pane, sized like `creator-dashboard`'s `PostModal`/`MediaFormShell`). The detail modal was reshaped this way specifically so the caption and like/comment/save row are visible immediately next to the image — the previous single-column, page-scrolling layout let a tall image push that content below the fold with no visual hint that there was more to scroll to.
