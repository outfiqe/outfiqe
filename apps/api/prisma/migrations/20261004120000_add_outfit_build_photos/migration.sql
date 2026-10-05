ALTER TYPE "OutfitEventType" ADD VALUE 'COVERS_CHANGED';

ALTER TYPE "ContentReportTarget" ADD VALUE 'OUTFIT_PHOTO';

ALTER TABLE "outfit_photos" ADD COLUMN "image_url" TEXT NOT NULL;
ALTER TABLE "outfit_photos" ADD COLUMN "cover_position" INTEGER;

ALTER TABLE "outfit_photos"
  ADD CONSTRAINT "outfit_photos_cover_only_for_build_photos"
  CHECK ("cover_position" IS NULL OR ("kind" = 'COVER' AND "cover_position" >= 0));

ALTER TABLE "outfit_photos"
  ADD CONSTRAINT "outfit_photos_removed_photo_is_not_a_cover"
  CHECK ("status" <> 'REMOVED' OR "cover_position" IS NULL);

CREATE UNIQUE INDEX "outfit_photos_one_photo_per_cover_position"
  ON "outfit_photos" ("outfit_id", "cover_position")
  WHERE "cover_position" IS NOT NULL;

CREATE INDEX "outfit_photos_status_created_at_idx" ON "outfit_photos" ("status", "created_at");
