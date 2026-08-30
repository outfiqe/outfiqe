-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "linked_brand_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "organizations_linked_brand_id_key" ON "organizations"("linked_brand_id");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_linked_brand_id_fkey" FOREIGN KEY ("linked_brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

