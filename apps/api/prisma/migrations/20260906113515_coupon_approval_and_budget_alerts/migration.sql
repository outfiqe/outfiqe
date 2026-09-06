-- AlterEnum
ALTER TYPE "NotificationEntityType" ADD VALUE 'COUPON';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'COUPON_APPROVAL_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE 'COUPON_BUDGET_ALERT';

-- AlterTable
ALTER TABLE "coupons" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by_id" UUID,
ADD COLUMN     "last_alerted_budget_threshold" INTEGER,
ADD COLUMN     "requires_approval" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
