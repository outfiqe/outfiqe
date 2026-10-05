# platform-jobs

## Purpose

The Jobs & health screen's API: how far behind the outbox is, which events are stuck, how each
outbox queue is doing, and buttons to send stuck or failed work again.

## Structure

- `platform-jobs.routes.ts` — mounted at `/api/platform`, all need `platform:jobs:manage`:
  `GET /jobs`, `POST /jobs/outbox/:eventId/retry`, `POST /jobs/queues/:queueName/retry-failed`.
- `platform-jobs.controller.ts`, `platform-jobs.service.ts`, `platform-jobs.repository.ts`.
- `platform-jobs.monitor.ts` — `runOutboxBacklogCheck`, the `outbox-backlog-check` job (every 5
  minutes, wired in `src/jobs/scheduled-jobs.ts`): reports to Sentry when more than 1,000 events
  are waiting or the oldest has waited more than 5 minutes, and warns when any event gave up after
  every retry.
- `platform-jobs.schemas.ts`, `platform-jobs.types.ts`, `platform-jobs.constants.ts`.
- Tests: `platform-jobs.integration.test.ts`, `platform-jobs.monitor.test.ts`.

## Funnel

**User-facing:** a super admin opens Jobs & health, sees how many events are waiting and since
when, which events gave up after every retry and why, and each queue's waiting, running, delayed
and failed counts. They can send a stuck event again, retry a queue's failed jobs, or open the
full queue dashboard.

**Technical:** admin `features/platform-jobs` → `/api/platform/jobs…` → `requirePlatformRole` →
controller → `platformJobsService` → `platformJobsRepository` (the `outbox_events` table) and
`getOutboxQueue` (BullMQ, `#outbox/outbox.queues.js`).

## Non-obvious rationale

- **"Stuck" means the relay gave up.** The relay stops picking up a row after
  `OUTBOX_MAX_PUBLISH_ATTEMPTS` tries (see `src/shared/outbox/README.md`). Sending it again sets
  its tries back to 0 and clears its error, so the next relay run picks it up; nothing is sent
  from this endpoint directly. A row that was already sent can't be reset.
- **A queue Redis can't reach doesn't break the screen.** Each queue's counts are read on their
  own; one that fails shows as "can't be reached" with zero counts, and the rest still load.
- **Retrying failed jobs** retries at most 500 of a queue's failed jobs per click, through
  BullMQ's own `job.retry()`, so the job keeps its id and handlers stay safe to run again.
- Every retry is written to the platform audit log.
- The queue dashboard link points at Bull Board (`/internal/queues`), which stays limited to
  co-founders on its own.
