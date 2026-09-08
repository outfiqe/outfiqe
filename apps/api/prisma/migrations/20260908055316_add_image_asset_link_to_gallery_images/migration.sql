-- AlterTable
ALTER TABLE "product_images" ADD COLUMN     "image_asset_id" UUID;

-- AlterTable
ALTER TABLE "creator_look_images" ADD COLUMN     "image_asset_id" UUID;

-- CreateIndex
CREATE INDEX "product_images_image_asset_id_idx" ON "product_images"("image_asset_id");

-- CreateIndex
CREATE INDEX "creator_look_images_image_asset_id_idx" ON "creator_look_images"("image_asset_id");

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "image_processing_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_look_images" ADD CONSTRAINT "creator_look_images_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "image_processing_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
