-- AlterTable
ALTER TABLE "products" ADD COLUMN     "is_stretchable" BOOLEAN,
ADD COLUMN     "size_standard_id" UUID;

-- AlterTable
ALTER TABLE "product_types" ADD COLUMN     "supports_fit_ranges" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "product_sizes" ADD COLUMN     "max_height_cm" INTEGER,
ADD COLUMN     "max_weight_kg" INTEGER,
ADD COLUMN     "min_height_cm" INTEGER,
ADD COLUMN     "min_weight_kg" INTEGER;

-- CreateTable
CREATE TABLE "brand_size_standards" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_size_standards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_size_standard_labels" (
    "id" UUID NOT NULL,
    "standard_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "brand_size_standard_labels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_fit_profiles" (
    "user_id" UUID NOT NULL,
    "height_cm" INTEGER NOT NULL,
    "weight_kg" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_fit_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "brand_size_standards_brand_id_archived_at_idx" ON "brand_size_standards"("brand_id", "archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "brand_size_standards_active_brand_id_name_key" ON "brand_size_standards"("brand_id", "name") WHERE "archived_at" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "brand_size_standard_labels_standard_id_label_key" ON "brand_size_standard_labels"("standard_id", "label");

-- CreateIndex
CREATE INDEX "products_size_standard_id_idx" ON "products"("size_standard_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_size_standard_id_fkey" FOREIGN KEY ("size_standard_id") REFERENCES "brand_size_standards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_size_standards" ADD CONSTRAINT "brand_size_standards_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_size_standard_labels" ADD CONSTRAINT "brand_size_standard_labels_standard_id_fkey" FOREIGN KEY ("standard_id") REFERENCES "brand_size_standards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_fit_profiles" ADD CONSTRAINT "user_fit_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;


ALTER TABLE "product_sizes" ADD CONSTRAINT "product_sizes_fit_range_complete" CHECK (
  ("min_height_cm" IS NULL AND "max_height_cm" IS NULL AND "min_weight_kg" IS NULL AND "max_weight_kg" IS NULL)
  OR ("min_height_cm" IS NOT NULL AND "max_height_cm" IS NOT NULL AND "min_weight_kg" IS NOT NULL AND "max_weight_kg" IS NOT NULL)
) NOT VALID;
ALTER TABLE "product_sizes" VALIDATE CONSTRAINT "product_sizes_fit_range_complete";

ALTER TABLE "product_sizes" ADD CONSTRAINT "product_sizes_fit_range_valid" CHECK (
  "min_height_cm" IS NULL OR (
    "min_height_cm" BETWEEN 50 AND 230 AND "max_height_cm" BETWEEN 50 AND 230
    AND "min_weight_kg" BETWEEN 10 AND 200 AND "max_weight_kg" BETWEEN 10 AND 200
    AND "min_height_cm" <= "max_height_cm" AND "min_weight_kg" <= "max_weight_kg"
  )
) NOT VALID;
ALTER TABLE "product_sizes" VALIDATE CONSTRAINT "product_sizes_fit_range_valid";

ALTER TABLE "user_fit_profiles" ADD CONSTRAINT "user_fit_profiles_measurements_valid" CHECK (
  "height_cm" BETWEEN 50 AND 230 AND "weight_kg" BETWEEN 10 AND 200
);

UPDATE "product_types" SET "supports_fit_ranges" = false WHERE "slug" IN ('footwear', 'headwear', 'accessories');

CREATE TEMPORARY TABLE "size_standard_backfill" AS
SELECT
  gen_random_uuid() AS "standard_id",
  grouped."brand_id",
  grouped."product_type_id",
  CASE
    WHEN COUNT(*) OVER (PARTITION BY grouped."brand_id", grouped."type_label") > 1
      THEN grouped."type_label" || ' sizes (' || grouped."type_slug" || ')'
    ELSE grouped."type_label" || ' sizes'
  END AS "name"
FROM (
  SELECT DISTINCT p."brand_id", p."product_type_id", pt."label" AS "type_label", pt."slug" AS "type_slug"
  FROM "products" p
  JOIN "product_types" pt ON pt."id" = p."product_type_id"
  WHERE EXISTS (SELECT 1 FROM "product_sizes" ps WHERE ps."product_id" = p."id")
) grouped;

INSERT INTO "brand_size_standards" ("id", "brand_id", "name", "created_at", "updated_at")
SELECT "standard_id", "brand_id", "name", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "size_standard_backfill";

INSERT INTO "brand_size_standard_labels" ("id", "standard_id", "label", "sort_order")
SELECT
  gen_random_uuid(),
  labels_in_use."standard_id",
  labels_in_use."label",
  ROW_NUMBER() OVER (
    PARTITION BY labels_in_use."standard_id"
    ORDER BY labels_in_use."catalog_sort_order" NULLS LAST, labels_in_use."lowest_product_sort_order", labels_in_use."label"
  ) - 1
FROM (
  SELECT
    backfill."standard_id",
    ps."label",
    MIN(so."sort_order") AS "catalog_sort_order",
    MIN(ps."sort_order") AS "lowest_product_sort_order"
  FROM "size_standard_backfill" backfill
  JOIN "products" p ON p."brand_id" = backfill."brand_id" AND p."product_type_id" = backfill."product_type_id"
  JOIN "product_sizes" ps ON ps."product_id" = p."id"
  LEFT JOIN "size_options" so ON so."product_type_id" = backfill."product_type_id" AND so."label" = ps."label"
  GROUP BY backfill."standard_id", ps."label"
) labels_in_use;

UPDATE "products" p
SET "size_standard_id" = backfill."standard_id"
FROM "size_standard_backfill" backfill
WHERE p."brand_id" = backfill."brand_id" AND p."product_type_id" = backfill."product_type_id";

DROP TABLE "size_standard_backfill";
