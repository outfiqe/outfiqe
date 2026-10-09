# @outfiqe/api

## Purpose

The Express + Prisma backend for every Outfiqe app (web, admin). Each feature lives in its own module under `src/modules/<module>/`, and every module follows the same layout so you can open any of them and know where things are.

## Module layout

### File names

Every file is kebab-case, named `<name>.<layer>.ts`: `creator-look.service.ts`, `tag-review.repository.ts`. Tests sit next to the file they cover: `<name>.<layer>.test.ts` for unit tests and `<name>.integration.test.ts` for tests that go through HTTP and a real database.

### The files every module has

| File                     | Owns                                                             |
| ------------------------ | ---------------------------------------------------------------- |
| `<module>.routes.ts`     | The route table and the middleware on each route.                |
| `<module>.controller.ts` | Reading the request and sending the response. No business logic. |
| `<module>.service.ts`    | Business rules, permission checks, domain events.                |
| `<module>.repository.ts` | Database reads and writes.                                       |
| `<module>.schemas.ts`    | Zod request validation.                                          |
| `<module>.types.ts`      | Response and input shapes.                                       |
| `README.md`              | Purpose, structure, both funnels, and any non-obvious reasoning. |

These are only added when a module needs them:

| File                                                                              | Owns                                                                                                                                      |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `<module>.constants.ts`                                                           | Named values: limits, windows, cache settings.                                                                                            |
| `<module>.utils.ts`                                                               | Pure helpers: mappers (`toSummary`), formatters, cursor shapes. No database calls.                                                        |
| `<module>.guards.ts`                                                              | Checks that load data and throw when it's missing or not allowed (`requireActiveLook`), when more than one part of the module needs them. |
| `<module>.socket.ts`, `<module>.events.ts`, `<module>.lifecycle.ts`, `providers/` | Socket handlers, event consumers, scheduled sweeps and third-party providers, where a module has them.                                    |

### Inside a file

Every file reads top to bottom in the same order:

1. Imports
2. Constants
3. Local types
4. Private helpers, grouped by what they do
5. One exported object: `<module>Service`, `<module>Repository`, `<module>Controller`

HTTP status codes always come from `HTTP_STATUS` in `#constants/http.constants.js`. Never write a bare number. A name that says why a status is used is fine when it adds meaning: `const CART_EMPTY_STATUS = HTTP_STATUS.BAD_REQUEST`.

### When a module grows: topic folders

A file is split once it passes roughly 300 lines. It's split by **topic** (a part of the feature, such as comments or the feed), not by layer. Each topic gets its own folder, holding that topic's layer files:

```
creator-looks/
  creator-look.routes.ts           ← small files stay whole at the root
  creator-look.controller.ts
  creator-look.service.ts          ← core logic + spreads in every topic service
  creator-look.repository.ts       ← core queries + spreads in every topic repository
  creator-look.schemas.ts
  creator-look.types.ts
  creator-look.constants.ts
  creator-look.utils.ts
  creator-look.guards.ts
  comments/
    comment.service.ts             ← creatorLookCommentService
    comment.repository.ts          ← creatorLookCommentRepository
    comment.integration.test.ts
  feed/
    feed.service.ts
    feed.repository.ts
    ...
```

The rules that keep this the same everywhere:

- **Small modules stay flat.** No folders until a file actually needs splitting.
- **Only the big files split.** Routes, controller, schemas, types and constants stay whole at the root until they pass about 300 lines themselves.
- **The root objects stay the public entry point.** `creatorLookService` and `creatorLookRepository` keep the same names and methods. They're the core methods plus every topic object spread in (`...creatorLookCommentService`). Other modules, the controller, sockets and jobs import only the root objects, so splitting a module never changes its callers.
- **Inside the module, a topic service calls its own topic repository** (`creatorLookCommentRepository.listComments`), not the root object.
- **Topic objects are named `<module><Topic><Layer>`**: `creatorLookFeedService`, `creatorLookCommentRepository`.
- **Helpers shared by two topics go up one level**, to the module root (`creator-look.guards.ts`, `creator-look.utils.ts`). A helper shared by two modules goes to `src/shared/`.
- **Tests move with their code.** Unit tests sit next to the file they test. An integration test about one topic sits in that topic's folder, and module-wide ones stay at the root. Shared integration fixtures go in `src/testing/integration/<module>-fixtures.ts`.

`src/modules/creator-looks/` is the reference module for this layout. Its README walks through each folder.

## Funnel

**User-facing:** every screen in the web and admin apps that reads or changes data calls this API.

**Technical:** `src/app.ts` mounts each module's routes → `<module>.routes.ts` → `<module>.controller.ts` → `<module>.service.ts` (or a topic service spread into it) → `<module>.repository.ts` (or a topic repository) → Postgres through Prisma, with Redis for caching, locks and domain-event streams. Scheduled work starts in `src/jobs/` and calls into the owning module's service.
