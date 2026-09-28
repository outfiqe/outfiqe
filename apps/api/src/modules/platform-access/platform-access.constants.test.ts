import { readFileSync } from "node:fs";
import path from "node:path";

import { PLATFORM_SECTION_ACCESS } from "@outfiqe/utils";
import { describe, expect, it } from "vitest";

import { PLATFORM_PERMISSION_KEYS } from "./platform-access.constants.js";

const SECTION_PERMISSION_MIGRATION = path.resolve(
  import.meta.dirname,
  "../../../prisma/migrations/20260926090000_add_section_platform_permissions/migration.sql",
);

describe("platform permission catalog", () => {
  it("declares every permission the shared section registry relies on", () => {
    const registryKeys = new Set(
      Object.values(PLATFORM_SECTION_ACCESS).flatMap((access) => access.permissionKeys),
    );

    const unknownKeys = [...registryKeys].filter(
      (key) => !(PLATFORM_PERMISSION_KEYS as readonly string[]).includes(key),
    );

    expect(unknownKeys).toEqual([]);
  });

  it("has no duplicate keys", () => {
    expect(new Set(PLATFORM_PERMISSION_KEYS).size).toBe(PLATFORM_PERMISSION_KEYS.length);
  });

  it("inserts every section permission in the migration that grants them to the built-in Admin", () => {
    const migrationSql = readFileSync(SECTION_PERMISSION_MIGRATION, "utf8");
    const sectionKeys = [
      ...new Set(Object.values(PLATFORM_SECTION_ACCESS).flatMap((access) => access.permissionKeys)),
    ];
    const keysAddedBeforeThisMigration = new Set([
      "platform:metrics:read",
      "platform:features:manage",
      "platform:impersonate",
      "platform:impersonate:manage",
      "platform:team:manage",
      "platform:support:read",
      "platform:support:respond",
      "platform:support:manage",
      "platform:withdraw:manage",
      "platform:coupons:manage",
      "platform:organizations:manage",
      "platform:xp:manage",
      "platform:gamification:manage",
      "platform:commissions:manage",
      "platform:announcements:manage",
      "platform:content:moderate",
    ]);

    const missingFromMigration = sectionKeys.filter(
      (key) => !keysAddedBeforeThisMigration.has(key) && !migrationSql.includes(`'${key}'`),
    );

    expect(missingFromMigration).toEqual([]);
  });
});
