# tag-reviews

## Purpose

The brand side of Brand Tag Review: a brand staffer's queue of creator product
tags awaiting a decision, and the approve / reject / revoke actions on them. The
write-path resolution that decides whether a new tag starts `PENDING` or
auto-approves lives in `../creator-looks`; this module only acts on tags that
already exist.

## Structure

- `tagReview.routes.ts` — `GET /tag-reviews` (queue), `POST /tag-reviews/:id/approve`, `POST /tag-reviews/:id/reject`. All `requireAuth` + `requireRole(BRAND_OWNER)`; the writes are rate-limited per user.
- `tagReview.controller.ts` — request/response glue only.
- `tagReview.service.ts` — resolves the caller's brand memberships, guards the state transition (`#lib/tag-review.utils.js`), stamps the reviewer, publishes the domain event, and re-runs `productService.recountWornBy` when a tag's counted-ness changes.
- `tagReview.repository.ts` — Prisma queries: the keyset-paginated queue (`submittedAt` desc), `findReviewableTag` (a single tag, only if its product's brand is one the caller is a member of), `transitionTag`, `trustCreator` (upsert into `BrandTrustedCreator`), `listMemberBrandIds`.
- `tagReview.schemas.ts` / `tagReview.types.ts` — Zod validation and DTO shapes.

## Funnel

**User-facing:** a brand owner opens the tag-review queue in their dashboard, sees each waiting tag (the look photo, the creator, the product, the size), and approves or rejects it — with a reason on a rejection. Approving optionally also marks the creator trusted so their future tags skip the queue.

**Technical:** `apps/web` brand dashboard → `tagReview.routes` → `tagReview.controller` → `tagReview.service` → `tagReview.repository` → Postgres. Approve/reject publish `PRODUCT_TAG_APPROVED` / `PRODUCT_TAG_REJECTED` / `PRODUCT_TAG_REVOKED` (and, on approve, `PRODUCT_TAGGED` so `xp` awards the tag XP the same way an auto-approved tag already does).

## Non-obvious rationale

**Reject and revoke are one endpoint (`POST /:id/reject`), not two.** The transition map (`canTransitionTagReview`) already allows `REJECTED` from both `PENDING` and `APPROVED`; the service reads the tag's prior state to decide which event to publish (`PRODUCT_TAG_REJECTED` for a pending tag, `PRODUCT_TAG_REVOKED` for a live one — they carry different notification copy) and whether to decrement `wornByCount`. A brand UI can still label the button "Reject" in the queue and "Remove" on a live tag; the API doesn't care.

**A rejected tag can't be re-approved by the brand.** `canTransitionTagReview` only allows `REJECTED → PENDING`, and that edge is the creator re-requesting via a look edit (`../creator-looks`). A brand that rejected by mistake tells the creator to request again. This matches the PRD's transition table; a brand-side "undo" is a possible later addition.

**Scoping is by `BrandMembership`, and a wrong id is a 404, not a 403.** `findReviewableTag` filters on `product.brandId IN <the caller's member brand ids>`, so a tag for another brand's product simply isn't found — the caller can't tell whether the id exists. Same probe-resistance as `../creator-looks`'s owner-scoped routes.

**`approvalSource` is set to `BRAND` on approve and cleared to `null` on reject.** It records that a human, not a policy or the SLA sweep, made this call — see the `TagApprovalSource` values and `../creator-looks/README.md`.

**The public "report this tag" endpoint and the counterfeit escalation are not here yet** — they land with the trust-&-safety chunk, which owns the decision about where a report goes. `PATCH /brands/me` gaining `tagReviewPolicy` / `autoApproveVerifiedBuyers` lives in `../brands`, not here.
