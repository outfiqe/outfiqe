# API reference generator

## Purpose

Builds `apps/api/openapi/openapi.json`, an OpenAPI 3.1 description of every `/api` endpoint, from
the code itself. The team's API reference on ops.outfiqe.com and the Postman collection are made
from that file, so nobody writes endpoint docs by hand.

## Structure

- `openapi.route-recorder.ts`: wraps Express's `Router.prototype.use` and `.route` before the app is
  built, then walks the finished app. For every endpoint it records the method, the full path, the
  routes file that defined it, and every middleware that runs for it (including router-level
  `router.use(...)` guards, in order).
- `openapi.access.ts`: turns that middleware list into "who can call it" notes, header parameters
  (`X-Forwarded-Host`, `Idempotency-Key`, `X-CSRF-Token`) and the errors each guard can return.
- `openapi.schemas.ts`: zod request schemas → JSON Schema (`z.toJSONSchema`, input side), response
  schemas inferred from recorded examples, and the success/error envelopes.
- `openapi.responses.ts`: the responses for one endpoint: recorded successes, recorded errors and
  the errors its guards can return.
- `openapi.operation.ts`: one endpoint → one OpenAPI operation (summary, description, parameters,
  body, security, responses).
- `openapi.builder.ts`: all endpoints → the document, with one tag per module (or topic folder)
  described by the first paragraph of that module's README "Purpose".
- `openapi.naming.ts`: summaries, tags, operation ids and path conversion.
- `openapi.example-recorder.ts`: test-only. When `API_DOCS_TASK=record`, wraps `res.json` so every
  JSON response an integration test gets is appended to `apps/api/openapi/recordings/`.
- `openapi.examples.ts` and `openapi.example-normalizer.ts`: match recordings to endpoints, keep
  one example per endpoint and status, redact secrets and swap ids, emails and times for stable
  placeholders.
- `openapi.spec-file.ts`: reading `examples.json` and writing JSON files.
- `openapi.generate.ts`: installs the recorder, builds the real app and returns the spec text.
- `openapi.spec.integration.test.ts`: fails when `openapi.json` no longer matches the code. With
  `API_DOCS_TASK=write` it writes the file instead.
- `openapi.docs-task.ts`: the script behind `docs:openapi` and `docs:record`.

## Funnel

**User-facing:** a teammate opens the API tab on ops.outfiqe.com (or imports `openapi.json` into
Postman), finds an endpoint under its module, and sees its fields, who can call it, real example
responses and errors, then tries it against a local or production API with their own token.

**Technical:**

1. `pnpm --filter @outfiqe/api docs:openapi` → `openapi.docs-task.ts write` → runs
   `openapi.spec.integration.test.ts` with `API_DOCS_TASK=write` → `generateOpenApiSpec()` →
   recorder + `createApp()` → `buildOpenApiDocument()` (reads `openapi/examples.json`) →
   `openapi/openapi.json`.
2. `pnpm --filter @outfiqe/api docs:record` → writes the spec once (to know the paths), runs the
   whole integration suite with `API_DOCS_TASK=record` → `test-app.ts` installs the example
   recorder → merges `openapi/recordings/*.jsonl` into `openapi/examples.json` → writes the spec
   again with the new examples.
3. `.husky/pre-commit` runs `docs:openapi` and stages `openapi.json` whenever a staged change
   touches `app.ts`, a `*.routes.ts`, `*.schemas.ts`, `*.controller.ts`, `*.middleware.ts` or
   `*.guards.ts` file, `shared/middlewares/`, a module README or this folder. If the Docker test
   containers aren't running it only warns.
4. Every normal integration run compares the committed `openapi.json` with the code (as parsed
   JSON, so formatting and line endings don't matter), so CI fails when anything slipped past the
   hook.
5. The internal docs repo copies `openapi.json` into its API tab (see that repo's README).

## Non-obvious rationale

- **It reads the real app instead of parsing route files as text.** Guards are often added for a
  whole router (`router.use(requireAuth)`) or spread from a list (`...platformGuards.ordersManage`),
  and schemas live in other files. Only the running app knows the final middleware list.
- **Guards and `validate()` carry docs metadata** (`describeRouteHandler` in
  `src/shared/utils/route-docs.utils.ts`). The zod schemas and permission keys are inside closures,
  so the generator could not see them otherwise. The metadata is a `WeakMap` entry and changes no
  behaviour. A few guards without metadata (`requireCsrfHeader`, `requireActiveAccount`,
  `enforceCoFounder`, `requireAdvancedCrmFeatures`, the upload handlers) are recognised by name in
  `openapi.access.ts`. Renaming one of those functions only loses its note in the docs.
- **It runs inside the integration test project** because importing the app needs the full test
  environment (env vars, database, Redis). That is also why `docs:openapi` starts the test
  containers first.
- **Examples come from the integration tests, not from production.** They never contain real
  customer data. Keys like `accessToken`, `password`, `secret` and `hash`, JWTs and password hashes
  are replaced with `<redacted>` before anything is written. Endpoints no test calls still show
  their request schema and the response envelope, just without a recorded example.
- **`openapi.json` and `examples.json` are generated. Never edit them by hand.** They are also in
  `.prettierignore`, so the commit formatter never rewrites them. Run `docs:openapi`
  after changing routes, and `docs:record` when examples should be refreshed. `recordings/` is
  git-ignored.
