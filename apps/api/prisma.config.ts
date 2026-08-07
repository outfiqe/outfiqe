import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moved CLI configuration out of schema.prisma into this file.
// It must sit at the root of the package that owns the schema (apps/api),
// next to package.json.
//
// Prisma 7 also no longer auto-loads .env, which is why "dotenv/config"
// is imported explicitly above.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // v7 removed automatic seeding after `migrate dev`/`migrate reset`.
    // Run `pnpm db:seed` explicitly.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
