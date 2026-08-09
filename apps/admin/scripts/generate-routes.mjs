// Generates src/routeTree.gen.ts outside of a running Vite process.
//
// The router-plugin Vite plugin (see vite.config.ts) only generates this file
// as a side effect of `vite dev`/`vite build`. `tsc -b` (typecheck, and the
// first half of build) runs standalone and needs the file to already exist,
// so CI fails on a fresh checkout. Run this first via the pretypecheck/prebuild
// hooks below to produce it ahead of time. Options must match vite.config.ts.
import { getConfig, Generator } from "@tanstack/router-generator";

const root = process.cwd();
const config = getConfig({ target: "react", autoCodeSplitting: true }, root);
const generator = new Generator({ config, root });
await generator.run();
