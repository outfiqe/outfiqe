-- CreateEnum
CREATE TYPE "FollowTargetType" AS ENUM ('USER', 'BRAND');

-- DropForeignKey
ALTER TABLE "follows" DROP CONSTRAINT "follows_following_id_fkey";

-- DropIndex
DROP INDEX "follows_following_id_idx";

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "follower_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rating" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "creator_look_products" ADD COLUMN     "size_worn" TEXT;

-- AlterTable: existing rows are all today's User-follows-User rows, so the
-- backfill default is dropped again once every row is tagged.
ALTER TABLE "follows" DROP CONSTRAINT "follows_pkey",
ADD COLUMN     "following_type" "FollowTargetType" NOT NULL DEFAULT 'USER',
ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("follower_id", "following_type", "following_id");

ALTER TABLE "follows" ALTER COLUMN "following_type" DROP DEFAULT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "worn_by_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "height_cm" INTEGER;

-- CreateTable
CREATE TABLE "product_sizes" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "in_stock" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_sizes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_products" (
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_products_pkey" PRIMARY KEY ("user_id","product_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_sizes_product_id_label_key" ON "product_sizes"("product_id", "label");

-- CreateIndex
CREATE INDEX "follows_following_type_following_id_idx" ON "follows"("following_type", "following_id");

-- AddForeignKey
ALTER TABLE "product_sizes" ADD CONSTRAINT "product_sizes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_products" ADD CONSTRAINT "saved_products_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_products" ADD CONSTRAINT "saved_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
