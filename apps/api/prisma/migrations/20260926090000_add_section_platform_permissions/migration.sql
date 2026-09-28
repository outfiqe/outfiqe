INSERT INTO "permissions" ("key", "label", "group") VALUES
  ('platform:catalog:read', 'View products, collections, categories, sizes, banners and trending', 'Catalog'),
  ('platform:catalog:manage', 'Edit the catalog and approve or reject submitted products', 'Catalog'),
  ('platform:orders:read', 'View orders and delivery zones', 'Orders'),
  ('platform:orders:manage', 'Update fulfilment, cancel orders and edit delivery zones', 'Orders'),
  ('platform:users:read', 'View user accounts', 'Users'),
  ('platform:users:manage', 'Create user accounts', 'Users'),
  ('platform:creators:read', 'View creators and creator applications', 'Creators'),
  ('platform:creators:manage', 'Approve or reject creator applications', 'Creators'),
  ('platform:brands:read', 'View brand applications', 'Brands'),
  ('platform:brands:manage', 'Approve or reject brand applications', 'Brands'),
  ('platform:reviews:moderate', 'Moderate product reviews and product tag reviews and reports', 'Moderation'),
  ('platform:finance:read', 'View the financial rollup and ledger', 'Finance'),
  ('platform:withdraw:read', 'View withdrawal requests and the withdrawal policy', 'Finance'),
  ('platform:coupons:read', 'View coupons and their redemptions', 'Finance'),
  ('platform:commissions:read', 'View commission tiers, payouts and platform fees', 'Finance'),
  ('platform:gamification:read', 'View badges, challenges, XP levels and competitions', 'Gamification'),
  ('platform:organizations:read', 'View tenant organizations', 'Platform'),
  ('platform:announcements:read', 'View broadcast announcements', 'Platform')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r."id", p."key"
FROM "roles" r
JOIN "organizations" o ON o."id" = r."organization_id" AND o."is_platform_org" = true
CROSS JOIN "permissions" p
WHERE r."is_built_in" = true
  AND r."name" = 'Admin'
  AND p."key" IN (
    'platform:catalog:read', 'platform:catalog:manage',
    'platform:orders:read', 'platform:orders:manage',
    'platform:users:read', 'platform:users:manage',
    'platform:creators:read', 'platform:creators:manage',
    'platform:brands:read', 'platform:brands:manage',
    'platform:reviews:moderate',
    'platform:finance:read',
    'platform:withdraw:read',
    'platform:coupons:read',
    'platform:commissions:read',
    'platform:gamification:read',
    'platform:organizations:read',
    'platform:announcements:read'
  )
ON CONFLICT DO NOTHING;
