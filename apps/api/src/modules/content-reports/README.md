# content-reports

## Purpose

Trust & safety on the `/explore` feed: a public "report this" path for a viewer who spots spam,
harassment, or worse on a creator's look or one of its comments, landing in one platform-staff
review queue. Also the intake for the moderator-initiated takedown built into `../creator-looks`
(`creatorLookService.remove`/`removeComment`) — resolving a report with `REMOVE_CONTENT` calls that
same code path rather than re-implementing the takedown here.

## Structure

- `contentReport.routes.ts` — `POST /content-reports` (public: `optionalAuth`, per-IP rate limit),
  `GET /content-reports` + `GET /content-reports/open-count` (`requireAuth` + `requirePlatformAccess`
  — coarse, same as `../tag-reports`), `POST /content-reports/:id/resolve` (same coarse gate at the
  route; the fine-grained `platform:content:moderate` check happens inside the service, only when
  the resolution is `REMOVE_CONTENT`).
- `contentReport.controller.ts` — request/response glue; pulls `req.ip` / `user-agent` for the
  submit path.
- `contentReport.service.ts` — `submitReport` (drops bot traffic silently, 404s a target that's
  already been removed), `listReports` / `countOpen`, and `resolveReport` — marks the report
  `ACTIONED` / `DISMISSED`; on `REMOVE_CONTENT` it explicitly checks
  `platformAccessService.principalHasPermission(principal, CONTENT_MODERATE_PERMISSION_KEY)` itself
  (a clear 403 if missing) before delegating the actual takedown to
  `creatorLookService.remove`/`removeComment`, then bumps the target author's `contentFlagCount`.
- `contentReport.repository.ts` — Prisma queries: `findReportableTarget` (branches on
  `ContentReportTarget` since a look and a comment live in different tables — there's no single
  polymorphic relation Prisma can join), `create`, `countOpen`, the keyset-paginated `listForAdmin`
  (batches a second lookup per target type — `hydrateLookTargets`/`hydrateCommentTargets` — rather
  than N+1 per row), `findResolvableReport`, `markResolved`, `incrementUserFlagCount`.
- `contentReport.schemas.ts` / `contentReport.types.ts` — Zod validation and DTO shapes.

## Funnel

**User-facing:** a viewer on `/explore` sees a post or comment that looks like spam, harassment, or
worse, opens its menu, picks Report, chooses a reason, optionally adds a note. Nothing changes on
the post — it stays live — but a row lands in the admin **Content reports** queue. Platform staff
review each report in context (target preview, reporter, the author's prior-removal count) and
either dismiss it or remove the content, at which point the author is on the hook the same way any
direct admin takedown works.

**Technical:** `POST /api/content-reports` → `contentReport.controller` →
`contentReport.service.submitReport` → `contentReport.repository.create`.
`POST /api/content-reports/:id/resolve` with `REMOVE_CONTENT` →
`contentReport.service.resolveReport` → `platformAccessService.principalHasPermission` (explicit
403 if it fails) → `creatorLookService.remove` / `.removeComment` (the same function a direct
`DELETE /api/creator-looks/:lookId[/comments/:commentId]` call uses, principal-checked and
audit-logged there) → `contentReport.repository.incrementUserFlagCount`.

## Non-obvious rationale

**No single polymorphic `Target` relation.** `ContentReport.targetId` is a loose reference —
`CreatorLook` and `CreatorLookComment` are separate tables with no shared parent Prisma can join
against. `findReportableTarget` and the two `hydrate*Targets` batch-lookups in the repository branch
on `targetType` instead; this mirrors how `notification.targets.ts` already resolves a notification's
target without a real foreign key, and keeps `listForAdmin` at two extra queries per page (one per
target type actually present), not one per row.

**The route-level gate is coarse for every action, including resolve.** A route-level
`requirePlatformRole` can't express "coarse access for DISMISS, `platform:content:moderate` only for
REMOVE_CONTENT" on the same endpoint — the same limitation `product-reviews` already documents for
its own owner-or-admin split. The fine-grained check moved into the service, and deliberately throws
its own explicit 403 (`platformAccessService.principalHasPermission`) rather than only relying on
`creatorLookService.remove`'s internal check, which 404s a non-owner/non-moderator to avoid leaking a
post's existence to an outsider — the wrong error for a staffer who is already looking straight at
the reported content in the queue.

**A report never auto-hides anything.** Reporting is unauthenticated and rate-limited but still
abusable; content only comes down when a platform reviewer with `platform:content:moderate` decides
so. Same posture `../tag-reports` already documents for tag takedowns.

**`User.contentFlagCount` is bumped only on a `REMOVE_CONTENT` resolution**, mirroring
`tagCounterfeitFlagCount`'s exact "repeat-offender signal, not an enforcement lever" rationale — it
doesn't gate anything in v1.

**A logged-in platform admin can't file a public report — they already have direct moderation
tools.** `submitReport` runs the shared `assertCanEngage` guard (`#lib/engagement-guard.utils.js`)
against `reporterUserId`, but only when one is present — an anonymous report (`reporterUserId`
`undefined`) is untouched, since the public/unauthenticated reporting path is intentional and
shouldn't require a login. An admin hitting this gets a 403 with an explanation instead of a
confusing "reported" toast for an action platform staff shouldn't need; the web report affordance
is hidden entirely for an admin viewer rather than left to error.

**Resolving a report whose target was already removed another way still succeeds.** `resolveReport`
re-checks `findReportableTarget` before attempting a takedown; if the content is already gone (e.g. a
different moderator deleted it directly moments earlier), it marks the report `ACTIONED` with
`contentRemoved: false` instead of throwing the `LOOK_NOT_FOUND`/`COMMENT_NOT_FOUND` that
`creatorLookService` would otherwise raise.
