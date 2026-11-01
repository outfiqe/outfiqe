INSERT INTO "permissions" ("key", "label", "group") VALUES
  ('platform:analytics:read', 'View product analytics', 'Platform')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r."id", p."key"
FROM "roles" r
JOIN "organizations" o ON o."id" = r."organization_id" AND o."is_platform_org" = true
CROSS JOIN "permissions" p
WHERE r."is_built_in" = true
  AND r."name" = 'Admin'
  AND p."key" = 'platform:analytics:read'
ON CONFLICT DO NOTHING;
