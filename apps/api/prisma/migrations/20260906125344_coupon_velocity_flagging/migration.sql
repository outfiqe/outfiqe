-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'COUPON_REDEMPTION_FLAGGED';

-- AlterTable
ALTER TABLE "coupon_redemptions" ADD COLUMN     "flag_reason" TEXT,
ADD COLUMN     "flagged_for_review" BOOLEAN NOT NULL DEFAULT false;
