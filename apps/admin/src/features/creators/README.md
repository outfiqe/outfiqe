# creators

## Purpose

Lets the team review creator (muse) applications and approve or reject them.

## Structure

- `api/creatorsApi.ts` — the cursor-paged creator list (`GET /creators`) and the approve/reject actions (`POST /creators/:userId/approve`, `/reject`).
- `api/creatorsSchemas.ts` — Zod schemas for the creator profile and the paged list.
- `hooks/useInfiniteCreators.ts` — the infinite-scroll query behind the list.
- `components/CreatorsPage.tsx` — the list with approve and reject buttons on each row.

## Funnel

**User-facing:** an admin opens Creators, scrolls the applications, and approves or rejects each one. An approved creator can start posting on the web app.

**Technical:** `routes/_authenticated.creators.tsx` → `components/CreatorsPage.tsx` → `hooks/useInfiniteCreators.ts` / `api/creatorsApi.ts` → `apiClient` → `/api/creators` in `apps/api/src/modules/creators`.
