-- AlterEnum
ALTER TYPE "NotificationEntityType" ADD VALUE 'PRODUCT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'PRODUCT_REVIEWED';
ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_REQUESTED';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "avg_rating" DOUBLE PRECISION,
ADD COLUMN     "rating_1_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rating_2_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rating_3_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rating_4_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rating_5_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_review_images" (
    "id" UUID NOT NULL,
    "review_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_review_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_review_helpful_votes" (
    "review_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_review_helpful_votes_pkey" PRIMARY KEY ("review_id","user_id")
);

-- CreateIndex
CREATE INDEX "product_reviews_product_id_deleted_at_created_at_idx" ON "product_reviews"("product_id", "deleted_at", "created_at");

-- CreateIndex
CREATE INDEX "product_reviews_product_id_deleted_at_rating_idx" ON "product_reviews"("product_id", "deleted_at", "rating");

-- CreateIndex
CREATE INDEX "product_reviews_product_id_deleted_at_helpful_count_idx" ON "product_reviews"("product_id", "deleted_at", "helpful_count");

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_product_id_user_id_key" ON "product_reviews"("product_id", "user_id");

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review_images" ADD CONSTRAINT "product_review_images_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review_helpful_votes" ADD CONSTRAINT "product_review_helpful_votes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "product_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review_helpful_votes" ADD CONSTRAINT "product_review_helpful_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
