# follows

## Purpose

Following/unfollowing users and brands, listing followers/following, and the "Creators to
follow" recommendation rail (`GET /follows/suggested-creators`). Owns the `Follow` graph edge
itself; the entities being followed (`User`, `Brand`) are owned by their own modules.

## Structure

- `follow.routes.ts`, `follow.controller.ts` — route table and thin request/response glue.
- `follow.service.ts` — `follow`/`unfollow`/`isFollowing`, `listFollowers`/`listFollowing`, and
  `suggestedCreators` (maps the repository's raw `UserRecord` page to the public `FollowTarget`
  shape via `toFollowTarget`).
- `follow.repository.ts` — Prisma/raw-SQL queries: the follow-edge CRUD, follower/following
  listings, and the full creator-suggestion pipeline (candidate generation, scoring, session-cursor
  pagination).
- `follow.schemas.ts` — Zod request validation, including `listSuggestedCreatorsQuerySchema`
  (`cursor`/`limit`).
- `follow.types.ts` — response/DTO shapes (`FollowTarget`, `FollowersPage`, `FollowingPage`,
  `SuggestedCreatorsPage`) and the suggestion pipeline's internal shapes (`CandidateSignals`,
  `ScoredSuggestionCandidate`, `MutualFollowCandidate`, `CreatorMomentumCacheEntry`).
- `follow.constants.ts` — candidate-pool sizes, score weights, boost/cap constants, and rotation
  tuning for the suggestion pipeline.
- `follow.utils.ts` — mappers (`toFollowTarget`, `toFollowerView`, `toBrandFollowTarget`) plus the
  suggestion pipeline's pure scoring/diversity math (`scoreSuggestionCandidate`,
  `isPureMomentumSignal`, `ensureMomentumDiscoveryFloor`, `suggestionRotationSeed`).

## Funnel

**User-facing:** a signed-in visitor follows/unfollows a creator or brand from a profile, post
card, or the Explore sidebar's "Creators to follow" rail. That rail always shows people the
viewer doesn't already follow; clicking "Find more" opens a scrollable, infinite-loading modal
over the same ranked pool (`apps/web/src/features/explore/components/SuggestedCreatorsModal.tsx`).

**Technical:** `follow.routes` → `follow.controller` → `follow.service` → `follow.repository` →
Postgres via Prisma, with Redis caching the creator-momentum candidate pool and the per-session
suggestion snapshot (see below).

## Non-obvious rationale

### "Creators to follow" — multi-signal ranking

**Why this exists.** `suggestedCreators` used to be a single flat query —
`ORDER BY (creator_status = 'APPROVED') DESC, follower_count DESC` — the same global popularity
list for every viewer, with no personalization at all. It now follows the same
candidate-generation → filter → rank → diversify → cache pipeline this codebase already built for
the Explore "For You" feed and hashtag trending (see `../creator-looks/README.md`), applied to
creators instead of posts.

**Four candidate sources, unioned by creator id, then scored:**

1. **Mutual-follow (2nd-degree graph)** — `listMutualFollowCandidates`, a self-join on `follows`
   finding accounts followed by people the viewer follows. The strongest signal (mirrors how
   Facebook's People You May Know is built primarily on mutual connections).
2. **Engaged, not yet followed** — creators the viewer liked/saved/commented on recently but
   doesn't follow, from `computeViewerEngagementAffinity` (`#lib/creator-engagement-affinity.utils.js`).
3. **Interest/hashtag affinity** — `listCreatorsByHashtagAffinity`, a direct query for which
   creators recently posted the hashtags the viewer's engagement history weights most heavily.
   This is genuine candidate generation, not just re-ranking: a niche creator with low overall
   momentum but a strong topical match can surface here even if no other source would have found
   them.
4. **Creator momentum (global pool + cold-start fallback)** — the un-personalized starting pool
   everyone (including a viewer with zero follows/engagement) draws from. Replaces the old flat
   `follower_count DESC` sort with the same decay/velocity/momentum math `../creator-looks` already
   built for post trend scoring, just grouped by `creatorId` instead of `lookId` — see
   `../creator-looks/README.md`'s "Creator momentum score" section for where this is computed.

**Scoring: base quality × personalization multiplier, not a separate sort key.** Each candidate
gets `baseScore = MOMENTUM_SCORE_WEIGHT * log1p(momentum) + FOLLOWER_COUNT_SCORE_WEIGHT *
log1p(followerCount)`, then a viewer-specific `multiplier` starting at `1`: `+` a mutual-follow
boost (scaled by connection count, capped) if any, else `+` a smaller engaged-not-followed boost
(mutual-follow and past-engagement don't stack — the stronger, more deliberate signal wins, same
rule `../creator-looks`'s `for_you` personalization already uses for posts), plus a capped
hashtag-overlap boost, always additive. `finalScore = baseScore * multiplier`. Personalization is
computed fresh per request, never cached per-viewer — the unioned candidate pool is small (bounded
by each source's own limit), so re-scoring it per request is cheap and avoids a whole second
per-user cache-invalidation surface for a rail a viewer might reload many times a day. Same
rationale `../creator-looks/README.md` documents for `for_you`'s `fetchEngagementAffinity`-derived
signals.

**New-creator freshness floor.** A candidate approved within `NEW_CREATOR_FRESHNESS_WINDOW_DAYS`
gets `baseScore = max(baseScore * NEW_CREATOR_FRESHNESS_MULTIPLIER, NEW_CREATOR_BASE_SCORE_FLOOR)`
— the `max(...)` matters because a brand-new creator with zero posts and zero followers has
`baseScore = 0`, and `0 * multiplier` stays `0` no matter how generous the multiplier is. The
floor guarantees a newly-approved creator gets some chance to surface even with no history yet,
the same "first record, no baseline to compute from" edge case `../creator-looks` handles for a
freshly-posted look. `User.creatorApprovedAt` (migration `20260821155513_add_user_creator_approved_at`)
exists specifically to power this — `updatedAt` was unusable, since it's bumped by unrelated
writes like follower-count changes.

**Discovery floor, not a per-group diversity cap.** Post/product rails cap "max N per brand/creator"
via `applyDiversity`, but every candidate here already _is_ one creator, so a per-creator cap is
meaningless. Instead, `ensureMomentumDiscoveryFloor` reserves `MIN_MOMENTUM_DISCOVERY_SLOTS` of the
first page for the top-scoring candidates whose _only_ signal is momentum (no mutual-follow, no
engagement, no hashtag match) — so a viewer with a large mutual-follow graph doesn't get a rail
that's 100% "friends of friends" with zero broader discovery.

**Weighted rotation, seeded per viewer per hour — not the fully global seed the product rail
uses.** `../trending`'s homepage rail seeds `applyWeightedRotation` off a time bucket alone, since
that rail is identical for every viewer. This pipeline is already personalized per viewer, so the
seed is `hash(viewerId) + hourBucket` (`suggestionRotationSeed`) — varies this viewer's order
slowly over time without a full reshuffle every request, and without making two different viewers'
rails rotate in lockstep.

**Two-tier fallback, not three.** `../creator-looks`'s trending/for_you snapshots have a
"cache miss → recompute synchronously" middle tier, backed by that module's own trend-metric
table. This pipeline deliberately skips that tier: recomputing the creator-momentum pool
synchronously would mean reading `creator_look_trend_metrics`, a table `../creator-looks` owns —
doing that directly from this module would create a circular module dependency (`../creator-looks`
already imports `followRepository.listFollowingIds` for its own `following`/`for_you` tabs). So a
momentum-cache miss here falls straight through to `listLegacySuggestedCreators` (the original flat
popularity query, kept verbatim as the final safety net) rather than attempting a cross-module
recompute. In practice this only matters in the brief window between a fresh deploy and the first
`explore-trending-scoring` cycle, or if that job is down — the same situations that already
degraded `../creator-looks`'s own snapshots to their legacy tier.

**Why the engagement-affinity query lives in `shared/`, not here or in `../creator-looks`.**
`computeViewerEngagementAffinity`/`listCreatorsByHashtagAffinity`
(`apps/api/src/shared/utils/creator-engagement-affinity.utils.ts`) query `creator_look_likes`/
`_saves`/`_comments`/`_hashtags` — tables `../creator-looks` owns. That module's own `for_you`
personalization needs the exact same "which creators has this viewer engaged with, and which
hashtags recur" computation this module needs. Per this repo's rule that a helper needed by a
second module stops being module-local, and since routing it through either module's service layer
would recreate the same `follows` ⇄ `creator-looks` circular-dependency problem the momentum-cache
read above avoids, it was promoted directly to `shared/utils` — both modules depend downward on it,
neither depends on the other.

**No per-viewer impression/click logging (yet).** A future move to collaborative filtering or
learned ranking would benefit from logging which suggestions were shown/clicked/dismissed, but
that's deliberately not built now — it's a real infra decision (volume, sampling, retention) that
should be driven by an actual downstream consumer, not spun up speculatively. See
`.local-docs/CREATOR-RECOMMENDATION-SYSTEM-PLAN.md` for the fuller phased plan this implementation
follows.

### Pagination: session-cursor snapshot, not offset-per-request

`suggestedCreators` computes the _entire_ ranked candidate list once per session
(`buildRankedSuggestionIds`), caches it in Redis under a random `sessionId`
(`cache:suggested-creators-snapshot:<sessionId>`, `SUGGESTED_CREATORS_SNAPSHOT` TTL), and paginates
by slicing that cached list — same shape as `../creator-looks`'s `listTrendingIds`/`listForYouIds`
snapshot cursors. This keeps the ranking (and its rotation) stable across pages within one
"session" of browsing — a viewer scrolling the "Find more" modal sees a consistent order, not a
re-shuffled one on every page fetch. The first page's ordering always matches what the un-paginated
sidebar rail would show (`buildRankedSuggestionIds` runs the discovery-floor swap against exactly
the first `SUGGESTED_CREATORS_LIMIT` positions before appending the rest of the scored pool), so
the rail and the "Find more" modal's first page are never inconsistent with each other.

**A session's cursor used to rewind to page one instead of resuming, if its snapshot cache expired
mid-scroll.** Same bug shape as `../creator-looks`'s `resolveTrendingSnapshotSource`/`listForYouIds`
(see that module's README). On a snapshot cache miss with a decoded cursor already in hand — the
`SUGGESTED_CREATORS_SNAPSHOT` TTL lapsing while a viewer was still scrolling the "Find more" modal —
`suggestedCreators` minted a brand-new `sessionId` **and** reset `offset` to `0`, so the very next
"load more" silently jumped back to page one instead of continuing where the viewer left off.
Reproduced as a real integration test before the fix: fetch page one, delete the session's Redis key
to simulate the TTL lapsing, fetch "page two" with the original cursor — got page one's creator
again instead of the second-ranked one. Fixed the same way as `../creator-looks`: `suggestedCreators`
now goes through `resolveSuggestionSnapshotSource`, which reuses the cursor's own `sessionId` (rather
than minting a new one) and clamps the cursor's `offset` into the freshly-rebuilt list instead of
discarding it.

### Read-time re-validation against bans and de-approval

**A creator could keep surfacing as "suggested" for the life of the snapshot cache, or even the
momentum cache, after being banned or de-approved.** `User.accountStatus` (`ACTIVE`/`SUSPENDED`/
`BANNED`) and `User.creatorStatus` (`NONE`/`PENDING`/`APPROVED`/`REJECTED`) are separate columns —
banning an account doesn't touch `creatorStatus`, and de-approving a creator doesn't touch
`accountStatus`. Three places in this pipeline read those columns, and only one of them checked
both:

1. `buildRankedSuggestionIds`'s own candidate query filtered `isCreator`/`creatorStatus` but never
   `accountStatus` — a suspended or banned creator with a stale `creatorStatus = APPROVED` could
   enter the ranked pool on a **fresh** build, not just a stale cached one.
2. `listLegacySuggestedCreators`'s raw SQL only used `creator_status = 'APPROVED'` as an `ORDER BY`
   priority, never as a `WHERE` filter — so once there weren't enough approved+active creators to
   fill `SUGGESTED_LIMIT`, it padded the list with `PENDING`/`REJECTED` creators and banned accounts
   instead of excluding them.
3. `suggestedCreators`'s final hydrate step — the query that turns a page of cached candidate ids
   into `UserRecord`s — did no status filtering at all. A creator cached into a snapshot while
   `APPROVED`/`ACTIVE` who gets banned or de-approved during the `SUGGESTED_CREATORS_SNAPSHOT` TTL
   still had their record served on the next "load more" fetch.

Reproduced as real integration tests before the fix: a mutual-followed candidate pre-banned before
ever being scored still showed up in a fresh build; a candidate cached into page two of a session
then banned (or de-approved) before that page was fetched still came back in the response; a
cold-start viewer with a `PENDING` and a `BANNED` "creator" in the DB got both back from the legacy
fallback alongside the one genuinely approved+active creator. All three now share one filter,
`ELIGIBLE_SUGGESTED_CREATOR_WHERE` (`isCreator`/`creatorStatus: APPROVED`/`accountStatus: ACTIVE`),
applied at candidate-selection time, at legacy-fallback time, and — the fix that actually closes the
cache-staleness window — again at final hydrate time, so a status change that happens after either
cache was populated is still caught the next time that id is read.

### Deterministic tie-break

**Two candidates with the exact same score had no guaranteed relative order.** `buildRankedSuggestionIds`
sorted scored candidates with `(a, b) => b.score - a.score`, no secondary key. Node's `Array.sort` is
stable, but the array being sorted came from `prisma.user.findMany({ where: { id: { in: [...] } } })`
with no `orderBy` — Postgres makes no guarantee about row order for an unordered `IN (...)` scan, so
a tie's "input order" (and therefore its output order, and which candidates land in the same
`applyWeightedRotation` tie-band together) was an accident of the query plan, not a controlled
property — the same class of bug `../creator-looks` found and fixed in `computeRankedLookScores`/
`computeRankedCreatorMomentumScores` (see that module's README). Fixed by extracting the comparison
into `compareSuggestionCandidatesByScore` (`follow.utils.ts`) — `b.score - a.score || a.creatorId.localeCompare(b.creatorId)`
— used for the main sort, with a matching `id`/`following_id` tiebreak added to the two raw-SQL
queries whose own `ORDER BY ... LIMIT` truncation could otherwise let a tied row silently swap in or
out of the candidate set between requests (`listMutualFollowCandidates`, `listLegacySuggestedCreators`).
Locked in with a unit test on the extracted comparator (asserting the same two creators sort into the
same order regardless of which order they're handed in) rather than a live-DB race, since a
same-process query on an otherwise-idle table rarely reproduces Postgres's lack of ordering
guarantees on demand — the risk is real regardless of whether a given local run happens to expose it,
exactly as `../creator-looks` found.

### Checked and already correct

`readCreatorMomentumPool` and the snapshot-cache read both already fail open on a Redis error or
corrupted payload (falling back to the other candidate sources, or the legacy list) rather than
5xx-ing the endpoint — confirmed by seeding a mutual-follow candidate, writing invalid JSON directly
into the momentum-score cache key, and getting a 200 with that candidate still present. Self-
suggestion and already-followed exclusion, the mutual-follow/hashtag boost caps, and
`ensureMomentumDiscoveryFloor`'s discovery-slot floor were all re-checked against the existing test
coverage and found correctly implemented — no changes made. This module has no raw-SQL hourly-bucket
aggregation of its own (unlike `../creator-looks`'s trend metrics); it only reads that module's
already-aggregated momentum cache and runs its own live queries, so the hour-boundary bucketing bug
`../creator-looks` had doesn't apply here.
