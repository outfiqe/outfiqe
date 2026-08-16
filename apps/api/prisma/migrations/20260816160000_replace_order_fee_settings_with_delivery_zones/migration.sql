-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "standard_delivery_fee" INTEGER NOT NULL,
    "free_delivery_threshold" INTEGER NOT NULL,
    "cod_handling_fee" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zone_cities" (
    "id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "city" TEXT NOT NULL,
    "city_normalized" TEXT NOT NULL,

    CONSTRAINT "delivery_zone_cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zone_history" (
    "id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "changed_by_id" UUID NOT NULL,
    "old_values" JSONB NOT NULL,
    "new_values" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_zone_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_zone_cities_city_normalized_key" ON "delivery_zone_cities"("city_normalized");

-- CreateIndex
CREATE INDEX "delivery_zone_cities_zone_id_idx" ON "delivery_zone_cities"("zone_id");

-- CreateIndex
CREATE INDEX "delivery_zone_history_zone_id_created_at_idx" ON "delivery_zone_history"("zone_id", "created_at");

-- AddForeignKey
ALTER TABLE "delivery_zone_cities" ADD CONSTRAINT "delivery_zone_cities_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "delivery_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_zone_history" ADD CONSTRAINT "delivery_zone_history_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "delivery_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_zone_history" ADD CONSTRAINT "delivery_zone_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Carry forward the live order_fee_settings row (not hardcoded defaults) into a
-- seeded default zone, so an admin's prior edits aren't lost by this migration.
INSERT INTO "delivery_zones" ("id", "name", "is_default", "standard_delivery_fee", "free_delivery_threshold", "cod_handling_fee", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Default zone', true, "standard_delivery_fee", "free_delivery_threshold", "cod_handling_fee", "updated_at", "updated_at"
FROM "order_fee_settings"
LIMIT 1;

-- Guarantee a default zone exists even if order_fee_settings had no row somehow.
INSERT INTO "delivery_zones" ("id", "name", "is_default", "standard_delivery_fee", "free_delivery_threshold", "cod_handling_fee", "created_at", "updated_at")
SELECT gen_random_uuid(), 'Default zone', true, 150, 5000, 50, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "delivery_zones");

-- AlterTable
ALTER TABLE "carts" ADD COLUMN "city" TEXT;

-- DropForeignKey
ALTER TABLE "order_fee_settings_history" DROP CONSTRAINT "order_fee_settings_history_settings_id_fkey";

-- DropForeignKey
ALTER TABLE "order_fee_settings_history" DROP CONSTRAINT "order_fee_settings_history_changed_by_id_fkey";

-- DropTable
DROP TABLE "order_fee_settings_history";

-- DropTable
DROP TABLE "order_fee_settings";
