-- AlterTable
ALTER TABLE "hero_slides" ADD COLUMN     "image_asset_id" UUID;

-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "image_asset_id" UUID;

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "banner_image_asset_id" UUID;

-- CreateIndex
CREATE INDEX "hero_slides_image_asset_id_idx" ON "hero_slides"("image_asset_id");

-- CreateIndex
CREATE INDEX "collections_image_asset_id_idx" ON "collections"("image_asset_id");

-- CreateIndex
CREATE INDEX "brands_banner_image_asset_id_idx" ON "brands"("banner_image_asset_id");

-- AddForeignKey
ALTER TABLE "hero_slides" ADD CONSTRAINT "hero_slides_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "image_processing_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_image_asset_id_fkey" FOREIGN KEY ("image_asset_id") REFERENCES "image_processing_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_banner_image_asset_id_fkey" FOREIGN KEY ("banner_image_asset_id") REFERENCES "image_processing_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
