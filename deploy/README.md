# deploy

Production deployment for the Outfiqe API (`main` branch -> one DigitalOcean droplet, Docker Compose). Frontends deploy separately on Vercel.

## What is here

| File                       | Role                                                                                                                                         |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker-compose.prod.yml`  | the five prod services: `caddy`, `api`, `worker`, `scheduler`, `redis`                                                                       |
| `Caddyfile`                | TLS + reverse proxy for the API domain; Caddy fetches and renews the certificate itself                                                      |
| `.env.prod.example`        | template for `deploy/.env.prod` — the real file lives only on the droplet, never committed                                                   |
| `.env.dev.example`         | reserved template for a future `dev` deployment (the `dev` branch is not deployed yet)                                                       |
| `docker-compose.local.yml` | build the image and run the whole stack (api/worker/scheduler + postgres + redis) locally, for parity testing without a registry or Supabase |
| `.env.local.stack.example` | template for `deploy/.env.local.stack`, consumed by `docker-compose.local.yml`                                                               |

The API image is built and pushed by `.github/workflows/deploy.yml`. The droplet only pulls and runs it.

## Local parity testing

Exercise the real production image on your machine — same `apps/api/Dockerfile`, same `tsx` runtime, same role split — against throwaway local Postgres and Redis. This is not the day-to-day dev loop (that stays `pnpm dev` + the root `docker-compose.yml`); use it to shake out the image before deploying.

```
cd deploy
cp .env.local.stack.example .env.local.stack

docker compose -f docker-compose.local.yml build

docker compose -f docker-compose.local.yml run --rm \
  --entrypoint node_modules/.bin/prisma api migrate deploy

docker compose -f docker-compose.local.yml up -d
curl http://localhost:4000/ready
```

`docker compose -f docker-compose.local.yml down -v` tears it down and drops the volumes. The stack has no Caddy — the `api` container's port `4000` is published directly. `APP_ENV=local` in the stack env keeps cookies non-`Secure` so plain `http://localhost` works; set it to `prod` to test the deployed logging/cookie behaviour.

## Environments

| Env file              | `APP_ENV` | Where it lives           | Used by                                                         |
| --------------------- | --------- | ------------------------ | --------------------------------------------------------------- |
| `apps/api/.env.local` | `local`   | each developer machine   | `pnpm dev`, tests (loaded by `apps/api/src/config/load-env.ts`) |
| `deploy/.env.prod`    | `prod`    | the droplet, `chmod 600` | `docker compose --env-file .env.prod`                           |
| `deploy/.env.dev`     | `dev`     | not yet — reserved       | a future dev stack                                              |

`NODE_ENV` stays a Node/library concern (`production` for any built container). `APP_ENV` is the deployment identity, because a `dev` deployment and a `prod` deployment are both `NODE_ENV=production` builds. Structured JSON stdout logs, secure cookies, and the Sentry environment tag all key off `APP_ENV` via `apps/api/src/config/app-env.ts`.

## Process roles

One image, four roles selected by `PROCESS_ROLE` (see `apps/api/src/processes/README.md`):

- `api` — HTTP + Socket.IO + realtime consumers
- `worker` — BullMQ image workers + background consumers
- `scheduler` — the timed jobs; keep it at `replicas: 1`
- `all` — everything in one process (local dev, tests, and any single-container deploy)

`docker-compose.prod.yml` runs `api`, `worker`, `scheduler` as separate services from the same image, each overriding `PROCESS_ROLE` in its own `environment:` block (which beats the value in `.env.prod`).

## Redis and storage

One `redis` container serves everything: the Socket.IO adapter, Redis Streams, the cache, rate limiting, scheduler locks, and the BullMQ image queue. No separate queue Redis. Its policy is `--maxmemory-policy noeviction` because queue jobs and stream entries must never be evicted; the cache degrades to cold on memory pressure (fail-open).

`app-uploads`, `app-image-assets`, `app-image-temp` are named volumes mounted into `api`, `worker`, and `scheduler` alike, so the temp file an upload writes in `api` is readable by the ingest job in `worker`. `STORAGE_DRIVER=local` for now; DigitalOcean Spaces is the later swap and only changes env, not code.

## One-time droplet setup

Ubuntu 24.04, 1 GB / 1 vCPU is enough for internal use.

1. Create a non-root user, add your SSH key, enable `ufw` for `OpenSSH`, `80`, `443`.
2. Add 2 GB swap (`fallocate -l 2G /swapfile` -> `mkswap` -> `swapon` -> add to `/etc/fstab`).
3. Install Docker: `curl -fsSL https://get.docker.com | sudo sh`, then add your user to the `docker` group.
4. `sudo mkdir -p /srv/outfiqe && sudo chown $USER /srv/outfiqe`.
5. Put `docker-compose.prod.yml`, `Caddyfile`, and `.env.prod` in `/srv/outfiqe`. `chmod 600 .env.prod`.
6. `docker login ghcr.io` with a token that has only `read:packages`.
7. Point an `A` record for the API domain (Cloudflare, DNS-only / grey cloud) at the droplet IP.
8. First bring-up:
   ```
   cd /srv/outfiqe
   docker compose -f docker-compose.prod.yml --env-file .env.prod pull
   docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm \
     -e DATABASE_URL="$(grep -E '^DIRECT_DATABASE_URL=' .env.prod | cut -d= -f2-)" \
     --entrypoint node_modules/.bin/prisma api migrate deploy
   docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
   curl https://<API_DOMAIN>/ready
   ```

## Filling in `.env.prod`

Copy `.env.prod.example` and replace every `######`. Notes:

- `IMAGE_REPO` — `ghcr.io/<github-owner>/outfiqe-api`. Must match the tags in `deploy.yml`.
- `IMAGE_TAG` — `latest` for manual runs; the deploy job overrides it with the commit SHA.
- `DATABASE_URL` — Supabase **pooled** string (port 6543), `?pgbouncer=true&connection_limit=3`.
- `DIRECT_DATABASE_URL` — Supabase **direct** string (port 5432). Used only for `prisma migrate deploy`, never at runtime.
- `REDIS_URL` / `IMAGE_QUEUE_REDIS_HOST` — both point at the internal `redis` service.
- `UPLOADS_DIR` / `IMAGE_STORAGE_ROOT_DIR` / `IMAGE_TEMP_UPLOAD_DIR` — keep under `/data`; they map to the shared volumes.
- `ALLOWED_ORIGINS` — every frontend origin, comma-separated. Tenant subdomains are matched against `TENANT_BASE_DOMAIN`.

## CI/CD

- `ci.yml` runs on push and PRs to `main` and `dev` (lint, typecheck, unit, integration, build). The coverage gate runs on push to `main` only.
- `deploy.yml` runs after a successful `CI` run on `main` (or manually via `workflow_dispatch`). It builds and pushes the image tagged with the commit SHA and `latest`, then over SSH: reclaims disk, checks free space, pulls, runs `prisma migrate deploy` against the direct URL, `up -d --remove-orphans`, and polls `/ready`.
- The `production` GitHub Environment gates the deploy job. Add a required reviewer there for a one-click approval.
- `keepalive.yml` curls `/ready` every three days so the Supabase free project does not pause.

### Required GitHub configuration

Environment `production` (or repo) secrets: `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `API_DOMAIN`.
Repo variable: `API_DOMAIN` (for `keepalive.yml`).
`GITHUB_TOKEN` (automatic) pushes to GHCR — no PAT needed for the push.

### Rollback

Re-run `deploy.yml` via `workflow_dispatch` after resetting `main` to the previous commit, or on the droplet:
`export IMAGE_TAG=<previous-sha> && docker compose -f docker-compose.prod.yml --env-file .env.prod up -d`.

## Disk on the droplet

The droplet's disk is the binding constraint, and a full one breaks a deploy at the image pull with a `no space left on device` error from containerd. Cleanup therefore runs at the **start** of the deploy script, before the pull, not at the end — a deploy that dies partway still leaves the box cleaner than it found it, and a box that has already filled up heals itself on the next run instead of needing a manual SSH.

The cleanup is `docker image prune -af`, and the `-a` matters. A bare `docker image prune -f` only removes _dangling_ images, and a superseded API image is never dangling: every deploy pulls both `outfiqe-api:<sha>` and `outfiqe-api:latest`, so when `latest` moves on, the old image still carries its own `<sha>` tag and survives every prune forever. Roughly forty-five deploys' worth of images accumulated that way before this was caught.

`--filter "until=24h"` keeps the last day of images so an incident rollback can skip the network. Pruning older ones is safe for rollback regardless — `up -d` with an older `IMAGE_TAG` re-pulls it from GHCR. Images backing a running container are never removed by prune, so the live stack is not at risk.

The free-space preflight then fails loudly with `docker system df` output if cleanup did not reclaim enough, so the failure names the problem instead of surfacing as a truncated layer write.

Other things sharing that disk, worth checking first when space runs short: the `app-uploads` / `app-image-assets` / `app-image-temp` volumes (`STORAGE_DRIVER=local` puts every user upload on the droplet), the Redis AOF, and container logs — every service caps its logs via the `x-container-logging` anchor, which is what keeps a long-lived JSON log from becoming the next outage.

When clearing space by hand, never pass `--volumes` to `docker system prune`. It would destroy `app-uploads`, `app-image-assets`, and `redis-data`. Plain `docker image prune -af` leaves volumes alone.

## Known gotchas

- Build the image on `linux/amd64` (the workflow does). Building on an ARM Mac needs `--platform=linux/amd64` or `sharp` fails at runtime.
- The runtime image runs the app with `tsx` (no compile-to-`dist` step). This sidesteps the `#alias -> ./src/*` import map and the Prisma 7 TypeScript client both needing a build. Compiling to `dist` is a later optimisation.
- `prisma migrate deploy` cannot run through the pooled connection — always use `DIRECT_DATABASE_URL`.
- On a 1 GB droplet, cap `sharp` concurrency and set BullMQ worker concurrency low via the `IMAGE_*_WORKER_CONCURRENCY` env vars; keep the 2 GB swap.
