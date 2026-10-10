# platform-jobs

## Purpose

The Jobs & health page for super admins: how far behind background work is, what is stuck, and
buttons to send it again.

## Structure

- `components/JobsHealthPage.tsx` — waiting count, oldest waiting time and stuck count; each outbox queue's
  waiting, running, delayed and failed jobs with "Retry failed jobs"; the stuck events with their
  last error and "Send again". Refreshes every 15 seconds.
- `api/platformJobsApi.ts`, `api/platformJobsSchemas.ts` — calls to `/api/platform/jobs…` and their Zod mirrors.

Route: `_authenticated.platform.jobs.index.tsx` (`/platform/jobs`). The "Jobs & health" sidebar
item is in `PLATFORM_NAV_ITEMS`.

## Funnel

**User-facing:** open Jobs & health, see whether anything is backed up or stuck, and retry it.

**Technical:** page → `useQuery` / `useApiMutation` → `platformJobsApi` → `/api/platform/jobs…`
→ `apps/api/src/modules/platform-jobs`.

## Non-obvious rationale

- **No link to the queue dashboard (Bull Board).** The page used to link to it, but the link
  could never work in production. It pointed at the web app's domain, and Bull Board checks the
  `Authorization` header, which a link opened in a new tab never sends. Everything needed day to
  day (backlog, stuck events, failed jobs, retries) is on this page, so the link was removed
  rather than adding a separate sign-in path to the dashboard.
