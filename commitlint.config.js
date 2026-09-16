const scopes = require("./commitlint.scopes.cjs");

/**
 * Conventional Commits, tightened for this repo. Enforced by the commit-msg
 * hook (.husky/commit-msg) on every commit.
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Restrict to the types we actually document in the README — trims the
    // conventional-commits default set down to what we use.
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "refactor",
        "test",
        "chore",
        "build",
        "ci",
        "perf",
        "style",
        "revert",
      ],
    ],
    // Scope is optional, but if given must name a real package or one of the
    // cross-cutting scopes in commitlint.scopes.cjs.
    "scope-enum": [2, "always", scopes],
    // config-conventional's default only forbids sentence/start/pascal/upper
    // case, which still allows legitimate uppercase acronyms (URL, TTL, API)
    // inside an otherwise lower-case subject.
    "subject-case": [2, "never", ["sentence-case", "start-case", "pascal-case", "upper-case"]],
    "subject-full-stop": [2, "never", "."],
    // GitHub's squash merge appends " (#NNN)" to the PR title to form the
    // commit header, after commitlint has already validated the PR's own
    // commits — so headers need slack beyond the 100 chars a contributor
    // actually controls, or a clean squash can retroactively fail this rule.
    "header-max-length": [2, "always", 120],
  },
};
