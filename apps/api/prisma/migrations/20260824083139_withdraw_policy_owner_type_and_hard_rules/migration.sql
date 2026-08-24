/*
  Warnings:

  - You are about to drop the column `owner_kind` on the `withdraw_requests` table. All the data in the column will be lost.
  - Added the required column `owner_type` to the `withdraw_policies` table without a default value. This is not possible if the table is not empty.
  - Added the required column `owner_type` to the `withdraw_requests` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WithdrawOwnerType" AS ENUM ('CREATOR', 'BUSINESS');

-- DropIndex
DROP INDEX "withdraw_policies_is_active_idx";

-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN     "first_payout_cross_checked_at" TIMESTAMP(3),
ADD COLUMN     "first_payout_cross_checked_by_id" UUID;

-- AlterTable
ALTER TABLE "brand_bank_accounts" ADD COLUMN     "first_payout_cross_checked_at" TIMESTAMP(3),
ADD COLUMN     "first_payout_cross_checked_by_id" UUID;

-- AlterTable
ALTER TABLE "withdraw_policies" ADD COLUMN     "owner_type" "WithdrawOwnerType" NOT NULL;

-- AlterTable
ALTER TABLE "withdraw_requests" DROP COLUMN "owner_kind",
ADD COLUMN     "first_approved_at" TIMESTAMP(3),
ADD COLUMN     "first_approved_by_id" UUID,
ADD COLUMN     "owner_type" "WithdrawOwnerType" NOT NULL,
ADD COLUMN     "requires_second_sign_off" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "WithdrawOwnerKind";

-- CreateIndex
CREATE INDEX "withdraw_policies_owner_type_is_active_idx" ON "withdraw_policies"("owner_type", "is_active");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_first_payout_cross_checked_by_id_fkey" FOREIGN KEY ("first_payout_cross_checked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_bank_accounts" ADD CONSTRAINT "brand_bank_accounts_first_payout_cross_checked_by_id_fkey" FOREIGN KEY ("first_payout_cross_checked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_first_approved_by_id_fkey" FOREIGN KEY ("first_approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
