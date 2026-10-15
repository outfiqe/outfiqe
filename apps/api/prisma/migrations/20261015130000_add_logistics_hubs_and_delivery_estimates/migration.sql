-- DropIndex
DROP INDEX "delivery_zone_cities_city_normalized_key";

-- AlterTable
ALTER TABLE "brand_applications" ADD COLUMN     "city" TEXT;

-- AlterTable
ALTER TABLE "delivery_zones" ADD COLUMN     "country_code" CHAR(2) NOT NULL DEFAULT 'NP',
ADD COLUMN     "max_delivery_days" INTEGER,
ADD COLUMN     "min_delivery_days" INTEGER;

-- AlterTable
ALTER TABLE "delivery_zone_cities" ADD COLUMN     "country_code" CHAR(2) NOT NULL DEFAULT 'NP';

-- CreateIndex
CREATE UNIQUE INDEX "delivery_zone_cities_country_code_city_normalized_key" ON "delivery_zone_cities"("country_code", "city_normalized");


-- AddCheckConstraint
ALTER TABLE "delivery_zones" ADD CONSTRAINT "delivery_zones_delivery_days_range_check" CHECK (
  ("min_delivery_days" IS NULL AND "max_delivery_days" IS NULL)
  OR ("min_delivery_days" >= 0 AND "max_delivery_days" >= "min_delivery_days")
);

-- AddLogisticsPermissions
INSERT INTO "permissions" ("key", "label", "group") VALUES
  ('platform:logistics:read', 'View hubs, pickups, riders, parcels and delivery partners', 'Logistics'),
  ('platform:logistics:manage', 'Run the hub, riders and delivery partners', 'Logistics')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "role_permissions" ("role_id", "permission_key")
SELECT r."id", p."key"
FROM "roles" r
JOIN "organizations" o ON o."id" = r."organization_id" AND o."is_platform_org" = true
CROSS JOIN "permissions" p
WHERE r."is_built_in" = true
  AND r."name" = 'Admin'
  AND p."key" IN ('platform:logistics:read', 'platform:logistics:manage')
ON CONFLICT DO NOTHING;
