// Valid commit scopes, derived from the actual workspace layout instead of
// hand-maintained. Add a new folder under apps/ or packages/ and it becomes
// a valid scope automatically — nothing else to update.
const fs = require("node:fs");
const path = require("node:path");

function packageDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

const workspaceScopes = [
  ...packageDirs(path.join(__dirname, "apps")),
  ...packageDirs(path.join(__dirname, "packages")),
];

// Cross-cutting scopes that don't map to a single package.
const sharedScopes = ["deps", "config", "ci", "release"];

module.exports = [...workspaceScopes, ...sharedScopes];
