# platform-jobs

## Purpose

The Jobs & health page for super admins: how far behind background work is, what is stuck, and
buttons to send it again.

## Structure

- `JobsHealthPage.tsx` — waiting count, oldest waiting time and stuck count; each outbox queue's
  waiting, running, delayed and failed jobs with "Retry failed jobs"; the stuck events with their
  last error and "Send again"; a link to the queue dashboard. Refreshes every 15 seconds.
- `api.ts`, `schemas.ts` — calls to `/api/platform/jobs…` and their Zod mirrors.

Route: `_authenticated.platform.jobs.index.tsx` (`/platform/jobs`). The "Jobs & health" sidebar
item is in `PLATFORM_NAV_ITEMS`.

## Funnel

**User-facing:** open Jobs & health, see whether anything is backed up or stuck, and retry it.

**Technical:** page → `useQuery` / `useApiMutation` → `platformJobsApi` → `/api/platform/jobs…`
→ `apps/api/src/modules/platform-jobs`. The queue dashboard link is built from the API's base URL
(`API_BASE_URL` in `lib/apiClient.ts`), because Bull Board is served by the API, outside `/api`.
