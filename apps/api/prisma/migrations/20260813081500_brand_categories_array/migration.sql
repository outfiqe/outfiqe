-- Convert single-value `category` columns to multi-value `categories` arrays,
-- preserving existing data as a one-element array before dropping the old column.

-- brand_applications
ALTER TABLE "brand_applications" ADD COLUMN "categories" "BrandCategory"[];
UPDATE "brand_applications" SET "categories" = ARRAY["category"];
ALTER TABLE "brand_applications" ALTER COLUMN "categories" SET NOT NULL;
ALTER TABLE "brand_applications" DROP COLUMN "category";

-- brands
ALTER TABLE "brands" ADD COLUMN "categories" "BrandCategory"[];
UPDATE "brands" SET "categories" = ARRAY["category"];
ALTER TABLE "brands" ALTER COLUMN "categories" SET NOT NULL;
ALTER TABLE "brands" DROP COLUMN "category";
