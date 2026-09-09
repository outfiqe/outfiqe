# tag-reports

## Purpose

Trust & safety on live product tags: a public "report this tag" path for anyone who spots a
counterfeit or misleading tag on a creator's look, plus the internal escalation a brand's
`COUNTERFEIT_SUSPECTED` rejection raises, all landing in one platform-staff review queue. Distinct
from `../tag-reviews` (the brand's own approve/reject queue) — this module is the platform's, and
it can act across every brand.

## Structure

- `tagReport.routes.ts` — `POST /tag-reports` (public: `optionalAuth`, per-IP rate limit, bot-UA filter), `GET /tag-reports` + `GET /tag-reports/open-count` + `POST /tag-reports/:id/resolve` (all `requireAuth` + `requirePlatformAccess`).
- `tagReport.controller.ts` — request/response glue; pulls `req.ip` / `user-agent` for the submit path.
- `tagReport.service.ts` — `submitReport` (drops bot traffic silently, 404s a tag that isn't live, hashes the reporter IP), `recordCounterfeitEscalation` (creates the `BRAND_COUNTERFEIT_REJECTION` row and bumps the creator's `tagCounterfeitFlagCount`), `listReports` / `countOpen`, and `resolveReport` — marks the report `ACTIONED` / `DISMISSED` and, when `takeDownTag` is set, calls `tagReviewService.takeDownTagAsPlatform` to revoke a still-live tag.
- `tagReport.repository.ts` — Prisma queries: `findReportableTag`, `create`, `incrementCreatorFlagCount`, `countOpen`, the keyset-paginated `listForAdmin` (with the tag / creator / product / brand joins a reviewer needs), `findResolvableReport`, `markResolved`.
- `tagReport.events.ts` — `registerTagReportEventConsumers()`: subscribes (consumer group `tag-reports`) to `PRODUCT_TAG_REJECTED` and `PRODUCT_TAG_REVOKED`, and on a `COUNTERFEIT_SUSPECTED` reason runs `escalateCounterfeitTagRemoval` → `recordCounterfeitEscalation`.
- `tagReport.schemas.ts` / `tagReport.types.ts` — Zod validation and DTO shapes.

## Funnel

**User-facing:** a shopper on a product page or a look sees a tag that looks fake, hits "Report",
picks a reason, optionally adds a note. Nothing changes on the post — the tag stays live — but a
row lands in the admin **Tag reports** queue. Separately, when a brand rejects a tag as a
suspected counterfeit, the same queue gets an entry and the creator's counterfeit-flag counter
ticks up. Platform staff review each report and either dismiss it or action it, optionally
removing the tag then and there.

**Technical:** `POST /tag-reports` → `tagReport.controller` → `tagReport.service.submitReport` →
`tagReport.repository.create`. The brand path is event-driven: `../tag-reviews` publishes
`PRODUCT_TAG_REJECTED` / `PRODUCT_TAG_REVOKED`, this module's consumer filters for the counterfeit
reason and calls `recordCounterfeitEscalation`. `POST /tag-reports/:id/resolve` →
`tagReport.service.resolveReport` → `tagReviewService.takeDownTagAsPlatform` (when asked) →
`applyTagRejection` in `../tag-reviews` (transition → `recountWornBy` → `PRODUCT_TAG_REVOKED`).

## Non-obvious rationale

**The brand → platform escalation is an event, not a direct call.** `../tag-reviews` already
publishes `PRODUCT_TAG_REJECTED` / `PRODUCT_TAG_REVOKED`; this module subscribes rather than being
imported by `tag-reviews`, so the dependency runs one way only (`tag-reports` → `tag-reviews`, for
the admin takedown) and a slow report write never blocks a brand's reject request.

**A report never auto-hides the tag.** Reporting is unauthenticated and rate-limited but still
abusable; the tag only comes down when a platform reviewer decides so (`takeDownTag`). This
matches the platform-monitoring posture the trademark/counterfeit research calls for — visible
process and fast human removal — without handing anonymous users a takedown button.

**Only live (`APPROVED`) tags are reportable.** A pending or already-rejected tag isn't public, so
there's nothing to report; `submitReport` 404s those rather than storing noise.

**The reporter's IP is stored hashed (`sha256`), never raw.** Enough to spot an abuse pattern
across reports, nothing that identifies a person — same `hashToken` the auth module uses for
refresh tokens.

**`tagCounterfeitFlagCount` is a denormalised counter on `User`, bumped only by
`BRAND_COUNTERFEIT_REJECTION`.** It's the "repeat infringer" signal a reviewer sees at a glance in
the queue. It doesn't gate anything in v1 — enforcement (suspending a creator after N flags) is a
later, deliberate decision, not an automatic one.
