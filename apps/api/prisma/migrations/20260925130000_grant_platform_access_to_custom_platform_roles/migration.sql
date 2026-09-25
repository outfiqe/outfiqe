INSERT INTO "permissions" ("key", "label", "group")
VALUES ('platform:access', 'Access Outfiqe''s own commerce admin sections', 'Platform')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT DISTINCT r."id", 'platform:access'
FROM "roles" r
JOIN "organizations" o ON o."id" = r."organization_id" AND o."is_platform_org" = true
JOIN "role_permissions" rp ON rp."role_id" = r."id" AND rp."permission_key" LIKE 'platform:%'
WHERE r."is_built_in" = false
ON CONFLICT DO NOTHING;
