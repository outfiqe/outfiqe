# Image Processing

## Purpose

The apps/api-side wiring for `@outfiqe/image-pipeline`: the Express route that accepts an upload
and enqueues it, the status endpoint a client polls, the Prisma-backed job-metadata repository, and
the composition root that starts/stops the BullMQ workers and mounts Bull Board. This module owns
no pipeline mechanics itself (no queues, no sharp, no storage-adapter implementations) — all of
that lives in the shared package; this module only supplies the app-specific dependencies
(Prisma, Multer, Express, this app's env/auth/logging) the package's factories are injected with.

## Structure

- `image-processing.routes.ts` / `.controller.ts` / `.service.ts` — `POST /api/image-processing`
  (Multer disk storage into the pipeline's temp dir, back-pressure check, rate limit, enqueue) and
  `GET /api/image-processing/:assetId` (status + signed variant URLs once complete).
- `image-processing.repository.ts` — `imageProcessingRepository` (app-facing: create, find by
  owner+checksum for idempotency, find by id+owner for the status route) and
  `prismaImageAssetRepository` (implements the package's `ImageAssetRepository` interface — this is
  what gets injected into the workers).
- `image-processing.utils.ts` — priority-tier resolution (`resolvePriorityTier`, from the
  uploader's role/creator status) and the Prisma-row ↔ package-`ImageAssetRecord` mappers.
- `image-processing.storage.ts` — the two `LocalDiskStorageAdapter` instances (temp upload dir,
  processed-output dir), resolved from the package's own `pipelineConfig`, plus one-time
  `mkdirSync` bootstrap (Multer's `diskStorage` engine, unlike this package's adapters, does not
  create its destination directory itself).
- `image-processing.queue.ts` — the Redis connection options, the `ImageProcessingQueues` instance,
  and thin wrappers (`checkImageIngestBackPressure`, `enqueueImageProcessingJob`) the route/service
  call into.
- `image-processing.workers.ts` — `startImageProcessingWorkers`/`stopImageProcessingWorkers`: wires
  every stage worker with this app's Prisma repository, storage adapters, and winston logger;
  attaches a `CircuitBreaker` per downstream-dependent stage (resize/optimize/thumbnail all read
  from storage or write to Postgres); attaches dead-letter-on-exhaustion listeners for every stage
  queue; schedules the cleanup repeatable job. Called once from `src/index.ts` at boot.
- `image-processing.bull-board.ts` — mounts Bull Board's Express router (internal-only, behind
  `requireAuth` + `requireRole("ADMIN")` at `/internal/queues` in `app.ts`).
- `image-processing.constants.ts` / `.schemas.ts` / `.types.ts` — upload limits/allowed mime types,
  the `:assetId` param schema, and the public (frontend-facing) asset/variant response shapes.

## Funnel

**User-facing:** a user submits an image via `POST /api/image-processing` (multipart, field
`file`) → gets back `202 { asset: { id, status: "pending" } }` immediately → polls
`GET /api/image-processing/:assetId` until `status: "completed"`, at which point `variants`
(signed URLs per width/format), `thumbnailUrl`, and `lqip` are populated for the frontend to render
a `srcset` with an instant blurred preview.

**Technical:** `POST` → `requireAuth` → rate limit (per-user, Redis-backed, same pattern as every
other write endpoint) → `checkImageIngestBackPressure` (429 + `Retry-After` if the ingest queue is
saturated) → Multer writes the file to the pipeline's temp dir → `imageProcessingController.upload`
loads the uploader's role/creator-status → `imageProcessingService.submitUpload` reads the temp
file back through `imageTempStorageAdapter` (never `fs` directly), computes its checksum, and
either returns an existing `ImageProcessingAsset` row (idempotent re-upload) or creates one and
calls `enqueueImageProcessingJob`, which hands off to the package's `enqueueImageProcessing`
(BullMQ Flow: ingest → resize → optimize, thumbnail triggered by ingest — see the package README
for why). Workers (started once at boot by `startImageProcessingWorkers`) process the flow,
persisting progress back to the same `ImageProcessingAsset` row via `prismaImageAssetRepository`.
`GET /:assetId` reads that row and maps it to signed URLs for the frontend.

## Non-obvious rationale

**This is a new, parallel upload path — it does not replace `modules/uploads`.** The existing
`POST /api/uploads` (Multer memory storage, synchronous `storage.upload()`, used for avatars/simple
image attachments today) is untouched. This module is for the high-concurrency, multi-variant,
async pipeline use case the spec asked for; wiring product/creator-look/review photo uploads over
to it (replacing their current synchronous `url`-only flow) is a distinct, larger integration task
explicitly out of scope here — the existing `ProductImage`/`CreatorLookImage`/`ProductReviewImage`
models only ever store a single `url`, and migrating them to async multi-variant output would
change those features' upload UX (immediate vs. eventually-consistent), which needs its own
decision, not a silent side effect of building this pipeline.

**Why a new `ImageProcessingAsset` Prisma model instead of reusing `shared/storage`'s
`StorageProvider`.** `shared/storage`'s `StorageProvider` (`upload`/`delete` only) is shaped for
synchronous "upload a file, get a URL back" use — it has no `get()`, no opaque-key contract, and no
concept of a job whose result arrives later. The pipeline's `StorageAdapter` (put/get/delete/
exists/getSignedUrl, keyed) is a different interface for a different concern (a queue needs to
_read back_ originals/intermediates to hand to the next stage) — this is a deliberate, stated
non-duplication decision, not an oversight of "reuse before creating."

**Priority tier is resolved server-side from the JWT's role plus a fresh `User` row read**
(`role`, `isCreator`, `creatorStatus`), not trusted from the client. `ADMIN` → `bulkAdmin`;
`isCreator && creatorStatus === "APPROVED"` → `paidCreator`; everyone else → `standard`. This one
extra `findUniqueOrThrow` per upload is the cost of not trusting a client-supplied priority value
for something that affects queue fairness.

**Idempotency is enforced at two layers that agree with each other.** The DB has a
`@@unique([ownerId, checksum])` constraint, and BullMQ's own job IDs are `stage + sha256(checksum)`
(see the package README) — so a duplicate upload from the same user is caught before a second DB
row or a second job is ever created, and a retried enqueue for an already-queued checksum is a
no-op at the BullMQ layer even if the DB check somehow raced.

**Bull Board is mounted at `/internal/queues`, guarded by `requireAuth` + `requireRole("ADMIN")`**
— explicitly not a public route. It's the operational surface for inspecting stuck jobs / manually
retrying dead-lettered ones; anyone able to reach it can see job payloads (including
`ownerId`/`checksum`), which is why it isn't just "internal-only by convention" but actually
auth-gated the same way every other admin-only surface in this codebase is.

## Not yet built (known gaps)

- **Reprocessing a failed asset.** Today, if `(ownerId, checksum)` already has a row, a duplicate
  upload always returns the existing row as-is — including a `failed` one. There is no "retry this
  failed upload" endpoint yet; the dead-letter queue (Bull Board, `/internal/queues`) is where a
  human currently goes to inspect/manually requeue a permanently-failed job.
- **No real-time push for status changes.** The frontend has to poll `GET /:assetId`; wiring a
  socket event (this codebase already has a Socket.IO layer for other domains) when an asset
  reaches `completed`/`failed` is a natural follow-up, not built here.
- **Multi-instance worker topology.** See the package README's "single-instance disk topology"
  rationale — this app currently runs ingest/processing against one shared local disk. Revisit
  before running workers on more than one DO instance without a shared volume.

## Running the tests

```bash
pnpm --filter @outfiqe/api exec vitest run --project unit src/modules/image-processing
pnpm --filter @outfiqe/api exec vitest run --project integration src/modules/image-processing
```

Integration tests use the real local Postgres/Redis (via `TEST_DATABASE_URL`/`REDIS_URL`, same as
every other module's integration tests) and hit the actual HTTP routes through `testApp`/supertest
— they do not start the BullMQ workers, so they verify the producer side (route → service →
repository → enqueue) and the status endpoint's DB read, not full worker completion. Full
end-to-end pipeline completion (ingest → resize → optimize → thumbnail, against real Redis) is
covered by `@outfiqe/image-pipeline`'s own integration suite instead of being duplicated here.
