import { existsSync } from "node:fs";
import path from "node:path";

import { config as loadDotenv } from "dotenv";
import { defineConfig, env } from "prisma/config";

const isDeployedEnv = process.env.APP_ENV === "dev" || process.env.APP_ENV === "prod";
if (!isDeployedEnv) {
  const localEnvPath = path.resolve(import.meta.dirname, ".env.local");
  if (existsSync(localEnvPath)) {
    loadDotenv({ path: localEnvPath });
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
