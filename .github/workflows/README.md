# CI / CD workflows

## Purpose

GitHub Actions pipeline for the monorepo. Every code change is verified on its pull request; `main`
is the release branch and the only thing that deploys to production.

## Structure

| File                       | Trigger                                                                                            | What it owns                                                                                                                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ci.yml`                   | `pull_request` (any base), excluding docs-only diffs                                               | The core gate: lint & format, typecheck, build, unit tests, browser (Playwright) tests, integration tests, an API start-up check, Lighthouse. A final `CI` job fans in on the required subset of those and is the one status check the `outfiqe` ruleset requires. |
| `ci-docs.yml`              | `pull_request` (any base), docs-only diffs                                                         | A single `CI` job that passes instantly, so a documentation-only PR is mergeable without running the real gate.                                                                                                                                                    |
| `commit-messages.yml`      | `pull_request` (any base)                                                                          | commitlint over the PR's `base..head` range.                                                                                                                                                                                                                       |
| `coverage.yml`             | `pull_request` -> `main`, excluding docs-only diffs                                                | Full `pnpm test:coverage` run with the 80% v8 thresholds. Non-blocking (`continue-on-error`).                                                                                                                                                                      |
| `validate-branch.yml`      | `pull_request` (any base)                                                                          | Branch-name convention + "only `dev` may PR into `main`".                                                                                                                                                                                                          |
| `deploy.yml`               | `push` -> `main` touching backend paths, `workflow_dispatch`                                       | Build the API image, push to GHCR, migrate and roll the droplet, wait for `/ready`.                                                                                                                                                                                |
| `keepalive.yml`            | `schedule`, `workflow_dispatch`                                                                    | Pings `/ready` every few days so Supabase doesn't idle-sleep.                                                                                                                                                                                                      |
| `publish-api-docs.yml`     | `push` -> `main` touching `apps/api/openapi/openapi.json`, `workflow_dispatch`                     | Tells `outfiqe/internal-docs` to rebuild and deploy ops.outfiqe.com, so the API tab always matches production. Needs the `DOCS_SYNC_TOKEN` secret (see below); without it the job only warns.                                                                      |
| `refresh-api-examples.yml` | `push` -> `dev` touching `apps/api/**` (not `apps/api/openapi/**` or READMEs), `workflow_dispatch` | Records fresh example responses from the API integration tests and opens or updates one PR, `chore/refresh-api-examples`, with the new `examples.json` and `openapi.json`. Needs the `API_EXAMPLES_PR_TOKENS` secret (see below).                                  |

"Docs-only diffs" means every changed file matches `**/*.md`, `docs/**`, `LICENSE`, `.gitignore`,
or `.gitattributes`. A PR that touches one of those _and_ a code file runs the real `ci.yml`.

## Funnel

Feature work:

1. Branch off `dev` as `<type>/<kebab-description>`, open a PR into `dev`.
2. `ci.yml` (or `ci-docs.yml` for a docs-only diff), `commit-messages.yml`, and
   `validate-branch.yml` run against the PR. `coverage.yml` does not (it is `main`-only).
3. Merge to `dev`. The PR already proved the merge result, so no checks run on the push to `dev`.
   The one exception is `refresh-api-examples.yml`: when the merge changed the API, it records new
   example responses and opens a `chore(api): refresh api examples` PR. Check its diff and merge
   it like any other PR.

Stacked work (a large feature split into PRs that each target the branch below):

1. Each PR in the stack runs the same `ci.yml`, `commit-messages.yml` and
   `validate-branch.yml` as a PR into `dev`, against the branch it targets. Every step is
   therefore proven on its own, not only the top of the stack.
2. A fix that every step needs goes on the bottom branch and is merged up through the stack.
   That way no PR depends on a fix that only lands in a later one.

Release:

1. Open the `dev -> main` promotion PR.
2. `ci.yml` (or `ci-docs.yml`), `commit-messages.yml`, `validate-branch.yml`, and now
   `coverage.yml` run against it.
3. Merge to `main`. If the merged diff touched any backend path, the push to `main` triggers
   `deploy.yml`, which deploys the merge commit to production. A purely frontend or docs release
   merges to `main` with no `deploy.yml` run at all -- `apps/web` / `apps/admin` ship through
   Vercel, not the droplet.

## Non-obvious rationale

**One event, one workflow run -- enforced at the trigger, not with `if:` guards.** A given change
is validated by exactly the workflows its event needs, and nothing is created just to be skipped
or cancelled:

- `ci.yml` has **no `push` trigger**. If `push` listed any branch that also gets PRs, the same
  commit would run CI twice (once per event) under two different runs. PRs are the gate;
  `dev` and feature branches never start a push-triggered CI run. This is why the required
  check lives only under `pull_request`.
- `push` to `main` is left to `deploy.yml` alone. `main` only ever advances through the
  `dev -> main` promotion PR, which has already run the full `ci.yml` gate, so re-running CI on
  the merge commit would be the same change a second time. The trade-off (accepted): the deploy
  trusts the promotion PR's green run rather than re-verifying the exact merge commit. Use
  `workflow_dispatch` on `deploy.yml` to redeploy without a new push.
- `coverage.yml` runs on `pull_request` into `main` only. `validate-branch.yml` guarantees that
  is always the `dev -> main` promotion PR, so coverage gates the release without adding a
  skipped job to every feature PR's CI run. It stays non-blocking here, same as before.
  Its time limit is 50 minutes. It runs every test with coverage one package at a time
  (`--concurrency=1`), which took 28 minutes in October 2026 and grows with the suite. A run
  that hits the limit is cancelled with no coverage report, so raise the limit before it gets
  close rather than after a release goes out unmeasured.
- `commit-messages.yml` and `coverage.yml` are separate files rather than `if:`-gated jobs inside
  `ci.yml` precisely so they never show up as permanently-"skipped" jobs on runs where they
  don't apply.
- `deploy.yml` builds and ships the **API** (Docker image + droplet). Its `push` trigger is
  `paths`-filtered to the API's full workspace dependency closure, so a frontend-only or
  docs-only change landing on `main` produces no `deploy.yml` run in the history at all -- not a
  skipped one. The paths list is: `apps/api/**`, `packages/types/**`, `packages/utils/**`,
  `packages/image-pipeline/**` (the three `@outfiqe/*` packages `apps/api` depends on, plus their
  own closure), `deploy/**` (the compose file and Caddyfile scp'd to the droplet), the root build
  inputs `package.json` / `pnpm-lock.yaml` / `pnpm-workspace.yaml` / `turbo.json` /
  `tsconfig.base.json`, and `deploy.yml` itself. **If you add an `@outfiqe/*` dependency to
  `apps/api` (or to one of those three packages), add its `packages/<name>/**` to this list**, or
  a backend-affecting release can merge to `main` without deploying. `workflow_dispatch` on
  `deploy.yml` is the escape hatch for any deploy the filter misses.

**API docs publish across two repos.** ops.outfiqe.com is built from the separate, private
`outfiqe/internal-docs` repo, which pulls `apps/api/openapi/openapi.json` from this repo's `main`
at build time. `publish-api-docs.yml` only sends it a `repository_dispatch`
(`api-spec-updated`); the build and the Cloudflare Pages deploy happen in that repo's own
`deploy.yml`. The default `GITHUB_TOKEN` can't reach another repo, so both sides use one
fine-grained token, `DOCS_SYNC_TOKEN`, stored as a secret in both repos. It's scoped to the
`outfiqe` org with access to only `outfiqe/outfiqe` (Contents: read) and `outfiqe/internal-docs`
(Contents: read and write, which `repository_dispatch` requires). When it expires, make a new one
with the same scopes and update the secret in both repos. It triggers on `main` only, so the
reference always describes what's running in production.

**API examples are refreshed by a PR, not by hand.** The example responses on the API tab come from
`apps/api/openapi/examples.json`, which only a full run of the API integration tests can rebuild
(see `apps/api/src/testing/openapi/README.md`). That is too slow to run on a laptop for every API
change, so `refresh-api-examples.yml` does it after the change reaches `dev`:

- Four `record` jobs run the integration tests split the same way as `ci.yml`, with
  `API_DOCS_TASK=record`, and each uploads its `recordings/*.jsonl`. A failing test only means
  fewer examples, so it warns instead of failing the job.
- One `merge` job downloads them into one folder (one subfolder per job, so file names can't
  collide), runs `openapi.docs-task.ts merge`, and stops if a full JWT or a bcrypt/argon2 hash
  appears in the diff. Redaction should already have removed them; this is a second check.
- It commits to the `chore/refresh-api-examples` branch and opens or updates the PR into `dev`.
  The rules block direct pushes to `dev`, so it has to be a PR. Merging that PR doesn't start the
  workflow again, because it only changes `apps/api/openapi/**`.
- A PR opened with the default `GITHUB_TOKEN` never starts other workflows, so the required checks
  would never report and the PR could never merge. The workflow therefore uses
  `API_EXAMPLES_PR_TOKENS`, a fine-grained token for the `outfiqe` org with access to only
  `outfiqe/outfiqe` (Contents and Pull requests: read and write). It is kept separate from
  `DOCS_SYNC_TOKEN` so the docs repo never holds a token that can write to this one. When it
  expires, make a new one with the same settings and replace the secret's value.
- It duplicates `ci.yml`'s top-level `env:` block for the same reason `coverage.yml` does (see
  below). Keep it in sync too.

**Two required checks: `CI` and `Branch Naming`.** The `outfiqe` ruleset on `dev` and `main`
requires only these two. `CI` is a fan-in job at the end of `ci.yml` -- it `needs` `lint`,
`typecheck`, `build`, `unit`, `integration` and `api-boot`, runs `if: always()`, and fails unless
every one of them reported `success` (a `skipped` or `cancelled` upstream job fails it too, so a
skipped lint can't sneak a merge through). So requiring `CI` already requires all of them, and
listing them separately in the ruleset adds nothing but a duplicate line per check on every PR.
The ruleset listed all seven until November 2026, which forced `ci-docs.yml` to echo five extra
checks. `browser` and `lighthouse` still run on every code PR but are not required;
`lighthouse` is `continue-on-error` regardless. To make a new job required, add it to the `CI`
job's `needs` list, not to the ruleset. If you rename the `CI` job in either file, update the
ruleset at the same time, or PRs stop being mergeable.

**`api-boot` starts the real API before anything merges.** It applies the migrations to an empty
Postgres, starts the API with the exact command the production image runs (`node --import tsx
--import ./src/instrument.ts src/index.ts`), and fails unless `/ready` answers within 90 seconds.
Tests load modules through Vitest, which is more forgiving than Node, so they cannot catch a module
that fails to load at startup. That happened once: the API imported a runtime value from
`@outfiqe/types`, every test passed, and production returned 502 until a fix was deployed. The
final `CI` job requires `api-boot`, so a PR that breaks startup cannot merge.

**Why a docs fast-path exists.** A GitHub workflow skipped by a `paths` filter never reports its
checks, and a required check that never reports blocks the PR from merging forever. So `ci.yml`
can't just `paths-ignore` the docs globs on its own -- a docs-only PR would be unmergeable.
`ci-docs.yml` is the documented workaround: it triggers on exactly the globs `ci.yml` ignores and
defines a single job **named `CI`, matching the required check**, that only echoes. Between the
two files `CI` always reports -- from the real fan-in on a code PR, from the echo on a docs-only
PR. `Branch Naming` comes from `validate-branch.yml`, which runs on every PR.

A mixed docs+code PR triggers both files (`ci.yml` because a code file changed, `ci-docs.yml`
because a doc changed), so `CI` appears twice. The real one finishes last, after every real job,
so it is what decides the merge; the echo is a harmless duplicate.

**`coverage.yml` and `refresh-api-examples.yml` duplicate `ci.yml`'s top-level `env:` block.** Actions has no supported way to
share an `env:` map across workflow files (no YAML anchors, no `env` in composite actions that
survives into later job steps). The coverage run exercises the same integration + web/admin
suites as `ci.yml`, so it needs the same `CI_*` vars and secrets. Keep the two blocks in sync
when either changes; a divergence shows up as coverage-only test failures.
