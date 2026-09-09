-- CreateEnum
CREATE TYPE "TagReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TagApprovalSource" AS ENUM ('BRAND', 'POLICY_OPEN', 'TRUSTED_CREATOR', 'VERIFIED_BUYER', 'SLA', 'GRANDFATHERED');

-- CreateEnum
CREATE TYPE "TagRejectionReason" AS ENUM ('NOT_OUR_PRODUCT', 'COUNTERFEIT_SUSPECTED', 'MISREPRESENTS_PRODUCT', 'POLICY_VIOLATION', 'OTHER');

-- CreateEnum
CREATE TYPE "BrandTagReviewPolicy" AS ENUM ('OPEN', 'TRUSTED_ONLY', 'APPROVAL_REQUIRED');

-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "auto_approve_verified_buyers" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "tag_review_policy" "BrandTagReviewPolicy" NOT NULL DEFAULT 'TRUSTED_ONLY';

-- AlterTable
ALTER TABLE "creator_look_products" ADD COLUMN     "approval_source" "TagApprovalSource",
ADD COLUMN     "re_request_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejection_note" TEXT,
ADD COLUMN     "rejection_reason" "TagRejectionReason",
ADD COLUMN     "review_status" "TagReviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by_id" UUID,
ADD COLUMN     "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Grandfather every tag that already exists as approved, so enabling the
-- tag-review feature never retroactively hides a currently-live product tag.
-- submitted_at is anchored to the tag's real creation time rather than now().
UPDATE "creator_look_products"
SET "review_status" = 'APPROVED',
    "approval_source" = 'GRANDFATHERED',
    "reviewed_at" = now(),
    "submitted_at" = "created_at";

-- DropIndex
DROP INDEX "creator_look_products_product_id_idx";

-- CreateIndex
CREATE INDEX "creator_look_products_product_id_review_status_idx" ON "creator_look_products"("product_id", "review_status");

-- CreateIndex
CREATE INDEX "creator_look_products_review_status_submitted_at_idx" ON "creator_look_products"("review_status", "submitted_at");

-- CreateTable
CREATE TABLE "brand_trusted_creators" (
    "brand_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "granted_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_trusted_creators_pkey" PRIMARY KEY ("brand_id","creator_id")
);

-- CreateIndex
CREATE INDEX "brand_trusted_creators_creator_id_idx" ON "brand_trusted_creators"("creator_id");

-- AddForeignKey
ALTER TABLE "creator_look_products" ADD CONSTRAINT "creator_look_products_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_trusted_creators" ADD CONSTRAINT "brand_trusted_creators_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_trusted_creators" ADD CONSTRAINT "brand_trusted_creators_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_trusted_creators" ADD CONSTRAINT "brand_trusted_creators_granted_by_id_fkey" FOREIGN KEY ("granted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
