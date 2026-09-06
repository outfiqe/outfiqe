-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'FIXED');

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "brand_discount_amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "list_unit_price" INTEGER;

UPDATE "order_items" SET "list_unit_price" = "unit_price" WHERE "list_unit_price" IS NULL;

ALTER TABLE "order_items" ALTER COLUMN "list_unit_price" SET NOT NULL;

-- CreateTable
CREATE TABLE "product_discounts" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "discount_type" "DiscountType" NOT NULL,
    "percent_basis_points" INTEGER,
    "fixed_amount" INTEGER,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_discounts_product_id_is_active_starts_at_ends_at_idx" ON "product_discounts"("product_id", "is_active", "starts_at", "ends_at");

-- AddForeignKey
ALTER TABLE "product_discounts" ADD CONSTRAINT "product_discounts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_discounts" ADD CONSTRAINT "product_discounts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
