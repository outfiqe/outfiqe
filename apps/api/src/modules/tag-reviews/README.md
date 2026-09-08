# tag-reviews

## Purpose

The brand side of Brand Tag Review: a brand staffer's queue of creator product
tags awaiting a decision, and the approve / reject / revoke actions on them. The
write-path resolution that decides whether a new tag starts `PENDING` or
auto-approves lives in `../creator-looks`; this module only acts on tags that
already exist.

## Structure

- `tagReview.routes.ts` — `GET /tag-reviews` (queue, `?status=` filter), `GET /tag-reviews/pending-count` (a single number for the dashboard header/badge), `POST /tag-reviews/:id/approve`, `POST /tag-reviews/:id/reject`. All `requireAuth` + `requireRole(BRAND_OWNER)`; the writes are rate-limited per user.
- `tagReview.controller.ts` — request/response glue only.
- `tagReview.service.ts` — resolves the caller's brand memberships, guards the state transition (`#lib/tag-review.utils.js`), stamps the reviewer, publishes the domain event, and re-runs `productService.recountWornBy` when a tag's counted-ness changes. `applyTagApproval` / `applyTagRejection` are the shared transition paths (transition → recount → publish `PRODUCT_TAGGED` + `PRODUCT_TAG_APPROVED`, or → publish `PRODUCT_TAG_REJECTED` / `_REVOKED`). `applyTagApproval` is called by both the brand's `approveTag` and the SLA sweep (tagging the event `auto` for every source other than `BRAND`); `applyTagRejection` by both the brand's `rejectTag` and `takeDownTagAsPlatform` (the entry point `../tag-reports` calls when a platform reviewer removes a reported tag — it loads the tag via `findTagForTransition` and no-ops if it's no longer live).
- `tagReview.repository.ts` — Prisma queries: the keyset-paginated queue (`submittedAt` desc), `countPending`, `findReviewableTag` (a single tag, only if its product's brand is one the caller is a member of), `findTagForTransition` (a tag by id with the fields an event payload needs — for the platform takedown path), `transitionTag`, `trustCreator` (upsert into `BrandTrustedCreator`), `listMemberBrandIds`, `listSlaEligibleTags` / `listBrandBacklogs` (the two scheduled-job reads). `resolveQueueSignals` annotates each page of queue rows with `isVerifiedBuyer` (creator has a settled on-platform purchase of that exact product) and `isTrustedCreator` (an explicit `BrandTrustedCreator` row) — two batched queries over the page's distinct creators/products/brands, not per row.
- `tagReview.jobs.ts` — `runTagReviewSlaSweep` (auto-approves tags left `PENDING` past `TAG_REVIEW_SLA_DAYS` under a policy that doesn't require a per-tag decision — `OPEN` / `TRUSTED_ONLY`; an `APPROVAL_REQUIRED` brand's tag never auto-approves) and `runTagReviewReminderDigest` (publishes `TAG_REVIEW_REMINDER_DUE` per brand whose backlog has tags older than `TAG_REVIEW_REMINDER_MIN_AGE_HOURS`). Both are composed into `apps/api/src/jobs/scheduled-jobs.ts`'s `INTERVAL_JOBS`; the logic lives here, `src/jobs/` only lists them.
- `tagReview.constants.ts` — the SLA window and reminder-digest cadence/threshold.
- `tagReview.schemas.ts` / `tagReview.types.ts` — Zod validation and DTO shapes.

## Funnel

**User-facing:** a brand owner opens the tag-review queue in their dashboard, sees each waiting tag (the look photo, the creator, the product, the size), and approves or rejects it — with a reason on a rejection. Approving optionally also marks the creator trusted so their future tags skip the queue.

**Technical:** `apps/web` brand dashboard → `tagReview.routes` → `tagReview.controller` → `tagReview.service` → `tagReview.repository` → Postgres. Approve/reject publish `PRODUCT_TAG_APPROVED` / `PRODUCT_TAG_REJECTED` / `PRODUCT_TAG_REVOKED` (and, on approve, `PRODUCT_TAGGED` so `xp` awards the tag XP the same way an auto-approved tag already does).

**Background:** the scheduler runs `runTagReviewSlaSweep` (auto-approve past the SLA window, same event path as a brand approve but `auto: true`) and `runTagReviewReminderDigest` (publish `TAG_REVIEW_REMINDER_DUE` per brand with a standing backlog) on the intervals in `tagReview.constants.ts`.

## Non-obvious rationale

**Reject and revoke are one endpoint (`POST /:id/reject`), not two.** The transition map (`canTransitionTagReview`) already allows `REJECTED` from both `PENDING` and `APPROVED`; the service reads the tag's prior state to decide which event to publish (`PRODUCT_TAG_REJECTED` for a pending tag, `PRODUCT_TAG_REVOKED` for a live one — they carry different notification copy) and whether to decrement `wornByCount`. A brand UI can still label the button "Reject" in the queue and "Remove" on a live tag; the API doesn't care.

**A rejected tag can't be re-approved by the brand.** `canTransitionTagReview` only allows `REJECTED → PENDING`, and that edge is the creator re-requesting via a look edit (`../creator-looks`). A brand that rejected by mistake tells the creator to request again. This matches the PRD's transition table; a brand-side "undo" is a possible later addition.

**Scoping is by `BrandMembership`, and a wrong id is a 404, not a 403.** `findReviewableTag` filters on `product.brandId IN <the caller's member brand ids>`, so a tag for another brand's product simply isn't found — the caller can't tell whether the id exists. Same probe-resistance as `../creator-looks`'s owner-scoped routes.

**`approvalSource` is set to `BRAND` on a brand approve, `SLA` on the sweep, and cleared to `null` on reject.** It records who made the call — a human, a policy, or the SLA sweep — see the `TagApprovalSource` values and `../creator-looks/README.md`.

**The SLA sweep only touches policies where a per-tag brand decision was never the point.** `OPEN` and `TRUSTED_ONLY` tags that fell through to `PENDING` (an untrusted creator, mostly) auto-approve after the window so a silent brand doesn't strand a creator's tag forever. `APPROVAL_REQUIRED` means the brand explicitly wants to see every tag — the sweep leaves those pending indefinitely, and the reminder digest is what nudges the brand instead.

**The reminder digest is a domain event (`TAG_REVIEW_REMINDER_DUE`), not a direct notification write.** The job computes per-brand backlog counts and publishes; `../notifications` owns fan-out to brand members and the grouped, count-refreshing `PRODUCT_TAG_REVIEW_REMINDER` row. Keeps this module free of notification-recipient logic, same boundary as every other producer.

**The queue signals (`isVerifiedBuyer` / `isTrustedCreator`) are advisory, not gates.** They're the two facts a brand most wants when deciding on a tag — "did they actually buy it" and "have I already vouched for them" — surfaced as badges in the dashboard. They don't change what's in the queue: a tag is only pending because no auto-approval rule caught it, so a "trusted" flag on a pending item just means the brand is on `APPROVAL_REQUIRED`, and a "verified buyer" flag means `autoApproveVerifiedBuyers` is off. `isTrustedCreator` is the explicit `BrandTrustedCreator` row only, not `../creator-looks`'s fuller "trusted" definition (prior approved tag, CreatorLink, attributed sale) — the brand cares whether _they_ trusted this creator, not whether history would have.

**The public "report this tag" endpoint, the counterfeit escalation, and the repeat-infringer counter live in `../tag-reports`, not here.** This module only publishes the reject/revoke events; `tag-reports` consumes `PRODUCT_TAG_REJECTED` / `_REVOKED` and escalates a `COUNTERFEIT_SUSPECTED` reason. The one hook back into this module is `takeDownTagAsPlatform`, called by `tag-reports` when a platform reviewer pulls a reported tag. `PATCH /brands/me` gaining `tagReviewPolicy` / `autoApproveVerifiedBuyers` lives in `../brands`, not here.
