-- CreateEnum
CREATE TYPE "ImageProcessingPriorityTier" AS ENUM ('PAID_CREATOR', 'STANDARD', 'BULK_ADMIN');

-- CreateEnum
CREATE TYPE "ImageProcessingQualityTier" AS ENUM ('STANDARD', 'HERO');

-- CreateEnum
CREATE TYPE "ImageProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "image_processing_assets" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "checksum" TEXT NOT NULL,
    "priority_tier" "ImageProcessingPriorityTier" NOT NULL,
    "quality_tier" "ImageProcessingQualityTier" NOT NULL,
    "status" "ImageProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "temp_storage_key" TEXT NOT NULL,
    "temp_file_cleaned_up" BOOLEAN NOT NULL DEFAULT false,
    "original_storage_key" TEXT,
    "resized_variants" JSONB,
    "encoded_variants" JSONB,
    "thumbnail_storage_key" TEXT,
    "lqip" TEXT,
    "optimize_completed_at" TIMESTAMP(3),
    "thumbnail_completed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_processing_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "image_processing_assets_status_idx" ON "image_processing_assets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "image_processing_assets_owner_id_checksum_key" ON "image_processing_assets"("owner_id", "checksum");

-- AddForeignKey
ALTER TABLE "image_processing_assets" ADD CONSTRAINT "image_processing_assets_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
