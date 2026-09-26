import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const MODULES_DIRECTORY = path.resolve(import.meta.dirname, "..");
const LOOSE_PLATFORM_GATE = "requirePlatformAccess";

const findRouteFiles = (): string[] =>
  readdirSync(MODULES_DIRECTORY, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) =>
      readdirSync(path.join(MODULES_DIRECTORY, entry.name))
        .filter((fileName) => fileName.endsWith(".routes.ts"))
        .map((fileName) => path.join(MODULES_DIRECTORY, entry.name, fileName)),
    );

describe("platform route guards", () => {
  it("finds the route files it is meant to check", () => {
    expect(findRouteFiles().length).toBeGreaterThan(40);
  });

  it("never uses the loose platform-staff gate directly in a route file", () => {
    const filesUsingLooseGate = findRouteFiles()
      .filter((routeFile) => readFileSync(routeFile, "utf8").includes(LOOSE_PLATFORM_GATE))
      .map((routeFile) => path.relative(MODULES_DIRECTORY, routeFile));

    expect(filesUsingLooseGate).toEqual([]);
  });
});
