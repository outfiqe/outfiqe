# @outfiqe/image-pipeline

## Purpose

A production-grade, back-pressure-aware background job system for image processing, built on
BullMQ and sharp. It is 100% storage-provider-agnostic — every read/write goes through a
`StorageAdapter` interface, never through `fs` or a provider SDK directly — and is fully unit- and
integration-testable without touching real disk, a real bucket, or requiring an app to be running.

This package owns the mechanics of the pipeline (queues, workers, sharp processing, storage
adapters). It does not own HTTP routes, Prisma persistence, or auth — those are wired up by the
consuming app (see `apps/api/src/modules/image-processing`).

## Structure

- `storage/` — the `StorageAdapter` interface (`put`/`get`/`delete`/`exists`/`getSignedUrl`) and
  three adapters: `LocalDiskStorageAdapter` (today's real backend, content-addressed paths under a
  root dir), `InMemoryStorageAdapter` (tests/CI, zero disk/network), and `R2StorageAdapter` (a
  stub — every method throws — that exists only to reserve the seam for the future R2 migration).
  `storage-adapter.contract.ts` is a shared Vitest suite every adapter is run through identically.
- `processing/` — pure, side-effect-free sharp functions: `image-validation.ts` (decompression-bomb
  and oversized/corrupt-file guards), `image-resize.ts` (Lanczos3, never-upscale breakpoint
  variants), `image-optimize.ts` (avif/webp/mozjpeg-jpeg encoding), `image-thumbnail.ts` (thumbnail
  - base64 LQIP). None of these touch a `StorageAdapter` or disk — they take and return `Buffer`s.
- `queue/` — BullMQ wiring: queue names, priority tiers, idempotent job IDs (checksum + stage
  hash), the back-pressure pure function, content-addressed key builders, the dead-letter-queue
  mechanism, and `enqueueImageProcessing` (builds the ingest→resize→optimize flow).
- `workers/` — one file per pipeline stage (`ingest`/`resize`/`optimize`/`thumbnail`/`cleanup`).
  Each exports both a pure `processXJob(job, deps)` function (unit-testable with an injected
  `StorageAdapter` + `ImageAssetRepository`, no BullMQ `Job` object required) and a
  `createXWorker(deps)` factory that wires it into a real BullMQ `Worker`.
- `config/pipeline.config.ts` — the single config module every env var (Redis connection,
  concurrency, rate limits, retry/backoff, lock/stall durations, cleanup sweep) is read through.
- `testing/` — `fixtures.ts` (synthetic sharp-generated test images — no binary fixtures committed
  to the repo) and `InMemoryImageAssetRepository` (the DB-free test double for the asset-metadata
  repository interface).

## Funnel

**User-facing**: a user uploads an image → the app's route stores it as an opaque `storageKey` and
returns immediately (202) with a `pending` asset → the pipeline processes it in the background →
the app's status endpoint (or a webhook/socket event it wires up) tells the frontend once
`avif`/`webp`/`jpeg` variants, a thumbnail, and an LQIP are ready.

**Technical**: producer app code calls `enqueueImageProcessing(connection, params)`, which builds a
BullMQ Flow: `optimize` (root) → child `resize` → grandchild `ingest`. `ingest`'s worker validates
the temp upload, persists it as `originals/<checksum>.<ext>` via the injected `StorageAdapter`, and
— since BullMQ jobs can only have one parent (see below) — separately enqueues the `thumbnail` job
onto its own queue at that same point. `resize` produces breakpoint-width variants; `optimize`
encodes each into avif/webp/jpeg; `thumbnail` generates a small webp + LQIP from the original. Every
stage reads/writes state through the injected `ImageAssetRepository` (keyed by `assetId`), not
through BullMQ job return values — see below for why.

## Non-obvious rationale

**Why "ingest → resize → optimize → (thumbnail as sibling)" isn't one single `FlowProducer.add()`
tree.** BullMQ's Flow parent/child mechanism is fan-_in_ only — a child job's `opts.parent` can
point at exactly one parent. `thumbnail` needs to run after `ingest` completes (it needs the
persisted original) but is otherwise independent of `resize`/`optimize`. There's no way to express
"one job, two parents" in a single Flow tree. The resolution: the real chain (`ingest` → `resize` →
`optimize`) is the one `FlowProducer.add()` builds (root `optimize`, child `resize`, grandchild
`ingest`); `thumbnail` is instead enqueued directly by `ingest`'s own worker the moment `ingest`
succeeds — same trigger point as `resize`, just via a plain `queue.add()` instead of the flow tree.
Both branches still get full BullMQ retry/backoff/DLQ isolation; they're just two separate queues
triggered at the same point rather than one literal tree node.

**Why `ImageAssetRepository`, keyed by `assetId`, is the real hand-off between stages — not
BullMQ's `getChildrenValues()`.** Since `thumbnail` isn't actually a flow child of `resize` (see
above), it can't read `resize`'s return value through BullMQ's parent/child value-passing. Instead,
every stage's worker fetches its inputs from the injected `ImageAssetRepository.findById(assetId)`
and writes its outputs back to it. This is also _why_ job payloads only ever carry an `assetId` —
one round trip to the repository is the single source of truth every stage (including the one that
isn't a "real" flow child) can rely on identically.

**Custom job IDs cannot contain `:`.** BullMQ reserves `:` as its own Redis key delimiter and
throws `Error: Custom Id cannot contain :` if a caller-supplied `jobId` has one. `buildIdempotentJobId`
therefore joins `stage` and the content hash with `-`, not `:` — found by an integration test
failure, not from reading the docs.

**Retry jitter is BullMQ's own `backoff.jitter`, not custom logic.** An earlier version of this
package implemented its own `backoffStrategies` map for exponential-plus-jitter delays. BullMQ 5.81
already supports `backoff: { type: 'exponential', delay, jitter }` natively (`jitter` is a 0–1
fraction of the computed delay) — reusing it removed ~60 lines of reinvented retry logic and
matches the "don't reinvent what BullMQ already provides" constraint this package is built under.

**libvips reports its own AVIF encoder output as `format: "heif"` on read-back**, since AVIF is an
HEIF-family container. Both `SUPPORTED_INPUT_FORMATS` (validation) and `EXTENSION_BY_FORMAT`
(content-addressed key naming) treat `"heif"` as equivalent to `"avif"` — otherwise a real AVIF
upload would be rejected as an "unsupported format" by the pipeline's own encoder.

**The scheduled temp-file cleanup sweep (`cleanup.worker.ts`) is the one place that reads `fs`
directly, deliberately not behind `StorageAdapter`.** Purging orphaned uploads needs "list files
older than N hours" against the local temp _staging_ directory specifically — a filesystem-mtime
operation with no equivalent, portable meaning for a future R2/S3 adapter (object listing there is
paginated, has no reliable "upload time" without extra metadata, and isn't a concern this package
promises to abstract). This is a stated, scoped exception, not an oversight: every other read/write
in the pipeline (originals, resized/encoded variants, thumbnails) stays behind `StorageAdapter`.

**The temp original is deleted only once _both_ `optimize` and `thumbnail` finish** —
`maybeCleanupTempFile` checks `isImageAssetFullyComplete` (both `optimizeCompletedAt` and
`thumbnailCompletedAt` set) before deleting, and is called from both workers' success paths. Since
`thumbnail` isn't a flow descendant of `optimize` (see above), there's no single "the pipeline is
done" callback BullMQ can give us — each of the two independent completion points has to check
whether the _other_ one already finished.

**Single-instance disk topology (decision, not a default).** This package assumes ingest and every
processing stage run against the _same_ local disk (single API/worker instance today, matching the
current local-Docker-Redis reality) — `LocalDiskStorageAdapter` resolves keys to a local root dir
with no cross-instance awareness. If workers are horizontally scaled across multiple DO instances
without a shared volume, a job's `ingest` and `resize` stages could land on different disks and
fail to find each other's files. The two ways out, neither built here: (a) a shared/NFS-style
volume all instances mount, or (b) job-affinity/sticky routing pinning a given `assetId`'s stages
to one instance. Revisit this before scaling workers past one instance.

## Failure modes

- **Corrupt/oversized/decompression-bomb images** are rejected by `validateImageBuffer` before any
  sharp resize/encode runs (`CorruptImageError`, `ImageTooLargeError`, `ImageDimensionsExceededError`).
- **A `StorageAdapter` throwing mid-pipeline** (e.g. a storage backend outage) rejects the stage's
  promise; BullMQ retries with exponential+jittered backoff up to `IMAGE_QUEUE_MAX_ATTEMPTS`, then
  the job is moved to the `image-dead-letter` queue via `attachDeadLetterOnExhaustion` rather than
  retrying forever or crashing the worker process.
- **A repeatedly-failing downstream dependency** trips the `CircuitBreaker` (consecutive-failure
  counter attached to a `Worker`'s `completed`/`failed` events) and pauses that stage's queue for a
  cooldown window, instead of burning through retries at full rate.
- **A crashed worker mid-job** leaves the original upload in the temp staging dir (never deleted
  until the whole pipeline succeeds) and BullMQ's own stalled-job detection
  (`lockDuration`/`stalledInterval`, both config-driven) reclaims and retries the job. The
  `image-cleanup` repeatable job separately purges anything orphaned past `IMAGE_TEMP_FILE_MAX_AGE_HOURS`.

## Running the tests

```bash
pnpm --filter @outfiqe/image-pipeline test           # unit + integration, with coverage
pnpm --filter @outfiqe/image-pipeline test:unit      # pure functions + mocked adapters, no Redis
pnpm --filter @outfiqe/image-pipeline test:integration  # full flow against a real local Redis
```

Integration tests need a reachable Redis (defaults to `redis://localhost:6379/15` — a dedicated
logical DB so it never collides with dev data on db 0; override with `IMAGE_PIPELINE_TEST_REDIS_URL`).
They use `InMemoryStorageAdapter`/`InMemoryImageAssetRepository` for storage and metadata, so no
real disk or database is touched — only Redis is real.

## Tuning concurrency/rate limits for 1500 concurrent users

Every number below is env-driven (see `config/pipeline.config.ts`) specifically so tuning is a
config change, never a code change.

- **Today (local Docker Redis, one droplet):** the shipped defaults
  (`IMAGE_RESIZE_WORKER_CONCURRENCY=4`, `IMAGE_OPTIMIZE_WORKER_CONCURRENCY=4`, a 20 jobs/sec rate
  limiter) are deliberately conservative — sized for a modest droplet's CPU core count, not
  1500 concurrent _sharp operations_. 1500 concurrent _users_ uploading does not mean 1500
  concurrent resize/encode operations happening at once: the whole point of this queue is that
  uploads get accepted immediately (202) and processed at a bounded rate afterward. The real
  bottleneck at this stage is almost always **local disk I/O and space**, not Redis or CPU — every
  original, every resized intermediate, and every encoded variant is a real file; watch disk
  headroom, not just queue depth.
- **What to change once you know real numbers:** raise `IMAGE_RESIZE_WORKER_CONCURRENCY` /
  `IMAGE_OPTIMIZE_WORKER_CONCURRENCY` toward (CPU cores − 1) once you know the droplet's actual vCPU
  count (sharp/libvips is CPU-bound and multi-threaded internally, so oversubscribing concurrency
  past core count adds contention, not throughput). Raise `IMAGE_QUEUE_BACKPRESSURE_MAX_DEPTH` only
  after confirming disk has headroom for that many pending originals sitting in temp storage at
  once.
- **When Redis moves to a hosted provider (Upstash or otherwise):** connection limits and
  command-count/rate limits become the new constraint that local Docker never had — a hosted
  free/low tier can have a hard cap on concurrent connections (each `Queue`/`Worker`/`QueueEvents`
  opens its own), and BullMQ is command-heavy (every job add/complete/retry is several Redis
  commands). Expect to need: fewer, longer-lived connections (share one `Queue`/`Worker` instance
  per queue across the process rather than creating ad hoc ones), and network latency between the
  app and Redis to start showing up in per-job overhead in a way it never did against localhost.
  None of this requires code changes here — only the `IMAGE_QUEUE_REDIS_*` env vars.

## Migration path to R2 (or any other provider)

1. Implement `R2StorageAdapter` for real (it's currently a stub that throws — see
   `storage/adapters/r2.adapter.ts`), satisfying the `StorageAdapter` interface.
2. Run the shared contract test suite (`storage-adapter.contract.ts`) against it — every adapter
   must pass identically before it's safe to use.
3. Swap which adapter gets injected at startup (in the consuming app's composition root, e.g.
   `apps/api/src/modules/image-processing/image-processing.storage.ts`) from `LocalDiskStorageAdapter`
   to `R2StorageAdapter`. No queue, worker, or `processing/` code changes — that's the entire point
   of the adapter boundary.
4. Existing content-addressed `storageKey`s (`originals/<checksum>.<ext>`, etc.) stay valid as-is;
   they're opaque keys, not filesystem paths, so nothing about in-flight or historical jobs needs
   migrating.
