-- AlterTable
ALTER TABLE "users" ADD COLUMN     "avatar_image_asset_id" UUID;

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "avatar_image_asset_id" UUID;

-- AlterTable
ALTER TABLE "product_review_images" ADD COLUMN     "image_asset_id" UUID;

-- CreateIndex
CREATE INDEX "users_avatar_image_asset_id_idx" ON "users"("avatar_image_asset_id");

-- CreateIndex
CREATE INDEX "brands_avatar_image_asset_id_idx" ON "brands"("avatar_image_asset_id");

-- CreateIndex
CREATE INDEX "product_review_images_image_asset_id_idx" ON "product_review_images"("image_asset_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_avatar_image_asset_id_fkey" FOREIGN KEY ("avatar_image_asset_id") REFERENCES "image_processing_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_avatar_image_asset_id_fkey" FOREIGN KEY ("avatar_image_asset_id") REFERENCES "image_processing_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_review_images" ADD CONSTRAINT "product_review_images_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "image_processing_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
