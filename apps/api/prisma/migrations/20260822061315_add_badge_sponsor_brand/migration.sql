-- AlterTable
ALTER TABLE "badges" ADD COLUMN     "sponsor_brand_id" UUID;

-- CreateIndex
CREATE INDEX "badges_sponsor_brand_id_idx" ON "badges"("sponsor_brand_id");

-- AddForeignKey
ALTER TABLE "badges" ADD CONSTRAINT "badges_sponsor_brand_id_fkey" FOREIGN KEY ("sponsor_brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
