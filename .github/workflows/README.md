# CI / CD workflows

## Purpose

GitHub Actions pipeline for the monorepo. Every code change is verified on its pull request; `main`
is the release branch and the only thing that deploys to production.

## Structure

| File                  | Trigger                                                      | What it owns                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ci.yml`              | `pull_request` -> `main`, `dev`, excluding docs-only diffs   | The core gate: lint & format, typecheck, build, unit tests, browser (Playwright) tests, integration tests, Lighthouse. These are the checks the `outfiqe` ruleset marks required. |
| `ci-docs.yml`         | `pull_request` -> `main`, `dev`, docs-only diffs             | Reports the five required contexts as instant passes so a documentation-only PR is mergeable without running the real gate.                                                       |
| `commit-messages.yml` | `pull_request` -> `main`, `dev`                              | commitlint over the PR's `base..head` range.                                                                                                                                      |
| `coverage.yml`        | `pull_request` -> `main`, excluding docs-only diffs          | Full `pnpm test:coverage` run with the 80% v8 thresholds. Non-blocking (`continue-on-error`).                                                                                     |
| `validate-branch.yml` | `pull_request` -> `main`, `dev`                              | Branch-name convention + "only `dev` may PR into `main`".                                                                                                                         |
| `deploy.yml`          | `push` -> `main` touching backend paths, `workflow_dispatch` | Build the API image, push to GHCR, migrate and roll the droplet, wait for `/ready`.                                                                                               |
| `keepalive.yml`       | `schedule`, `workflow_dispatch`                              | Pings `/ready` every few days so Supabase doesn't idle-sleep.                                                                                                                     |

"Docs-only diffs" means every changed file matches `**/*.md`, `docs/**`, `LICENSE`, `.gitignore`,
or `.gitattributes`. A PR that touches one of those _and_ a code file runs the real `ci.yml`.

## Funnel

Feature work:

1. Branch off `dev` as `<type>/<kebab-description>`, open a PR into `dev`.
2. `ci.yml` (or `ci-docs.yml` for a docs-only diff), `commit-messages.yml`, and
   `validate-branch.yml` run against the PR. `coverage.yml` does not (it is `main`-only).
3. Merge to `dev`. Nothing runs on the push to `dev` -- the PR already proved the merge result.

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
  checks live only under `pull_request`.
- `push` to `main` is left to `deploy.yml` alone. `main` only ever advances through the
  `dev -> main` promotion PR, which has already run the full `ci.yml` gate, so re-running CI on
  the merge commit would be the same change a second time. The trade-off (accepted): the deploy
  trusts the promotion PR's green run rather than re-verifying the exact merge commit. Use
  `workflow_dispatch` on `deploy.yml` to redeploy without a new push.
- `coverage.yml` runs on `pull_request` into `main` only. `validate-branch.yml` guarantees that
  is always the `dev -> main` promotion PR, so coverage gates the release without adding a
  skipped job to every feature PR's CI run. It stays non-blocking here, same as before.
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

**Why a docs fast-path exists.** A GitHub workflow that is skipped by a `paths` filter never
reports its checks, and a required check that never reports blocks the PR from merging forever. So
`ci.yml` can't just `paths-ignore` the docs globs on its own -- a docs-only PR would be
unmergeable. `ci-docs.yml` is the documented workaround: it triggers on exactly the globs
`ci.yml` ignores and defines jobs with the **same names as the required contexts**
(`Lint & Format`, `Typecheck`, `Build`, `Unit tests`, `Integration tests`) that do nothing but
echo. Between the two files, those contexts always report -- from the real gate on a code PR,
from the fast-path on a docs-only PR. A mixed docs+code PR triggers both (`ci.yml` because a code
file changed, `ci-docs.yml` because a doc changed); the real gate is what actually blocks the
merge, the echo run is a harmless duplicate green check.

**`coverage.yml` duplicates `ci.yml`'s top-level `env:` block.** Actions has no supported way to
share an `env:` map across workflow files (no YAML anchors, no `env` in composite actions that
survives into later job steps). The coverage run exercises the same integration + web/admin
suites as `ci.yml`, so it needs the same `CI_*` vars and secrets. Keep the two blocks in sync
when either changes; a divergence shows up as coverage-only test failures.

**Required status checks are matched by job name.** The `outfiqe` ruleset requires the contexts
`Lint & Format`, `Typecheck`, `Build`, `Unit tests`, `Integration tests`, `Branch Naming`. Those
job `name:` values in `ci.yml` / `validate-branch.yml` are load-bearing -- renaming one silently
drops it from the merge gate until the ruleset is updated to match, and the first five must stay
mirrored in `ci-docs.yml` or docs-only PRs stop being mergeable.
