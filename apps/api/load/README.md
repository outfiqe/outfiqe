# load

## Purpose

Load tests that run against a real API, outside the normal test suite. Today there is one: 500
people using Outfit Build boards at once.

## Structure

- `outfit-boards.k6.js` — a [k6](https://k6.io) script. Each virtual person opens their board,
  then taps "I'm happy" or "not happy" with the version they just saw, every 2.5 seconds. With
  five people on each board they often edit at the same moment, so it exercises version
  conflicts as well as plain load.
- `../prisma/seed-load-outfit-boards.ts` (`pnpm --filter @outfiqe/api load:seed:outfit-boards`) —
  creates the people and boards through the running API and writes `outfit-boards.json` here:
  each board's id and the access tokens of its owner and four editors. That file holds real
  tokens, so it is git-ignored.

## Funnel

**Technical:** seed script → `POST /api/outfits` and `POST /api/outfits/:id/members` on the
running API → `outfit-boards.json` → k6 → `GET /api/outfits/:id` and `PUT /api/outfits/:id/happy`.

## Running it

Run it against a staging copy, never production: it creates 500 accounts and 100 boards.

```bash
pnpm --filter @outfiqe/api load:seed:outfit-boards -- --boards=100
cd apps/api/load
k6 run outfit-boards.k6.js
```

Settings, through environment variables: `LOAD_API_URL` (default `http://localhost:3000`),
`LOAD_PEOPLE` (default 500), `LOAD_DURATION` (default `3m`), `BOARDS_FILE`.

## What passing means

- `accepted_edit_duration` p95 under 200 ms: most accepted changes finish in under 200 ms.
- `server_errors` under 0.1%: a `409` version conflict is the expected answer to a stale edit, not
  an error; a `5xx` is.
- While it runs, watch the API logs and Postgres for pool exhaustion
  (`Timed out fetching a new connection from the connection pool`); there must be none.

## Non-obvious rationale

- **Editing "I'm happy" is the least destructive write that still bumps the version**, so the test
  measures the full write path (role check, version claim, history row, outbox row) without
  filling boards with items that would run into slot limits.
- **The pause keeps each person under the 30 edits a minute rate limit**, so the test measures the
  board, not the rate limiter.
