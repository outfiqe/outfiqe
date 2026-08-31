import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { config as loadDotenv } from "dotenv";

import { IS_LOCAL } from "./app-env.js";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LOCAL_ENV_FILE = ".env.local";

if (IS_LOCAL) {
  const localEnvPath = path.join(PACKAGE_ROOT, LOCAL_ENV_FILE);
  if (existsSync(localEnvPath)) {
    loadDotenv({ path: localEnvPath });
  }
}
