CREATE INDEX "outfits_updated_at_id_idx" ON "outfits" ("updated_at" DESC, "id" DESC);

INSERT INTO "permissions" ("key", "label", "group") VALUES
  ('platform:builds:read', 'View outfit builds, their history and build metrics', 'Outfit Build'),
  ('platform:builds:manage', 'Unlock or archive outfit builds', 'Outfit Build'),
  ('platform:jobs:manage', 'See background jobs and retry failed ones', 'Platform')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r."id", p."key"
FROM "roles" r
JOIN "organizations" o ON o."id" = r."organization_id" AND o."is_platform_org" = true
CROSS JOIN "permissions" p
WHERE r."is_built_in" = true
  AND r."name" = 'Admin'
  AND p."key" IN (
    'platform:builds:read',
    'platform:builds:manage',
    'platform:jobs:manage',
    'platform:settings:manage',
    'platform:flags:manage',
    'platform:audit:read'
  )
ON CONFLICT DO NOTHING;
