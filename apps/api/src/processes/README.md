# processes

## Purpose

The API is one built image that runs as one of four process roles, chosen at
boot by the `PROCESS_ROLE` environment variable. `src/index.ts` reads it and
dynamically imports exactly one starter from this folder, so a `worker` or
`scheduler` container never loads the Express app or the route tree.

## Roles

| `PROCESS_ROLE`  | Starter                 | Runs                                                                       | Replicas                          |
| --------------- | ----------------------- | -------------------------------------------------------------------------- | --------------------------------- |
| `all` (default) | `startCombinedProcess`  | everything, in one process — identical to the pre-split boot sequence      | 1 (local dev, single-box deploys) |
| `api`           | `startApiProcess`       | HTTP + Socket.IO + realtime consumers + admin bootstrap                    | 1..N                              |
| `worker`        | `startWorkerProcess`    | BullMQ image workers + background domain-event consumers + a health server | 1..N                              |
| `scheduler`     | `startSchedulerProcess` | interval + boundary schedulers + a health server                           | exactly 1                         |

`all` exists so local development (`pnpm dev`), the test suite, and a
single-container deployment behave exactly as they did before the split.

## Structure

| File                   | Owns                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `../index.ts`          | the dispatcher: `PROCESS_ROLE` -> one starter                                                                           |
| `combined.process.ts`  | `all` — the full boot sequence                                                                                          |
| `api.process.ts`       | `api` — request/realtime serving                                                                                        |
| `worker.process.ts`    | `worker` — queues + background consumers                                                                                |
| `scheduler.process.ts` | `scheduler` — timed jobs only                                                                                           |
| `consumers.ts`         | the two registration groups: `registerRealtimeConsumers`, `registerBackgroundConsumers`                                 |
| `health-server.ts`     | a dependency-free `/health` + `/ready` HTTP server for the roles that do not run Express (`worker`, `scheduler`)        |
| `shutdown.ts`          | `registerGracefulShutdown(steps)` — one SIGINT/SIGTERM handler that runs teardown steps in order, flushes Sentry, exits |

## Funnel

### Technical flow

`index.ts` -> `env.PROCESS_ROLE` -> `import("./processes/<role>.process.js")` ->
`start<Role>Process()` -> registers its consumers / servers -> `registerGracefulShutdown`.

Readiness (`/ready`) is one shared check (`#lib/readiness.utils.ts`:
`SELECT 1` + Redis `PING`) used by both the Express app (`api`, `all`) and the
standalone `health-server` (`worker`, `scheduler`).

## Non-obvious rationale

### How consumers were split

Every `register*` call from the old `index.ts` was sorted by one question: does
it (directly or transitively) call `getIO()` from `#socket/socket.server.ts`?

- **Yes -> `registerRealtimeConsumers` (`api` / `all` only).** These need the
  in-process Socket.IO server. This includes the `*SocketHandlers` (client
  connection handlers) and the stream consumers that end in `getIO().emit(...)`:
  `registerCommentEventConsumer`, `registerLeaderboardEventConsumer`,
  `registerCreatorLeaderboardEventConsumer`, `registerMessageEventConsumer`,
  `registerPresenceSocketConsumer`, and the `*SocketEventConsumer` group.
- **No -> `registerBackgroundConsumers` (`worker` / `all`).** These only write to
  Postgres or enqueue work: `registerXpEventConsumers`,
  `registerAchievementEventConsumers`, `registerNotificationEventConsumers`. The
  notification event consumer publishes a `NOTIFICATION_CREATED` domain event
  that the `api` role's `registerNotificationSocketEventConsumer` turns into a
  socket emit, so the DB write and the emit stay in their own roles.
  `notification.service.ts` also calls `getIO()` for read-receipt emits, but only
  on request-handler paths, which run in the `api` role.

Putting a realtime consumer in `worker` would throw at registration (`getIO()`
before `initSocket`). A test in `consumers.test.ts` pins the two lists.

### Scheduler replica count

`scheduler` should run as a single instance, but `interval.scheduler.ts` already
guards every job with a Redis `SET NX PX` lock, so a second scheduler process is
wasteful rather than corrupting.

### Health server vs Express

`worker` and `scheduler` do not mount Express. They run `health-server.ts` — a
bare `node:http` server exposing only `/health` and `/ready` — so the same
container healthcheck command works for every role.
