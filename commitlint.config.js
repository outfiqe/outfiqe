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
    "subject-case": [2, "always", "lower-case"],
    "subject-full-stop": [2, "never", "."],
  },
};
