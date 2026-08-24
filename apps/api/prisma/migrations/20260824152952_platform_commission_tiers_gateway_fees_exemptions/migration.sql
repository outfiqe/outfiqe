/*
  Warnings:

  - You are about to drop the column `rate_percent_basis_points` on the `platform_commission_rules` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PlatformFeeType" AS ENUM ('FLAT', 'PERCENT');

-- AlterTable
ALTER TABLE "brand_payouts" ADD COLUMN     "platform_commission_tier_id" UUID;

-- AlterTable
ALTER TABLE "platform_commission_rules" DROP COLUMN "rate_percent_basis_points";

-- CreateTable
CREATE TABLE "platform_commission_tiers" (
    "id" UUID NOT NULL,
    "rule_id" UUID NOT NULL,
    "min_price" INTEGER NOT NULL,
    "max_price" INTEGER,
    "fee_type" "PlatformFeeType" NOT NULL,
    "flat_amount" INTEGER,
    "rate_percent_basis_points" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "platform_commission_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gateway_fee_rates" (
    "id" UUID NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "rate_percent_basis_points" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gateway_fee_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_commission_exemptions" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoked_by_id" UUID,

    CONSTRAINT "brand_commission_exemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "platform_commission_tiers_rule_id_idx" ON "platform_commission_tiers"("rule_id");

-- CreateIndex
CREATE INDEX "gateway_fee_rates_payment_method_is_active_idx" ON "gateway_fee_rates"("payment_method", "is_active");

-- CreateIndex
CREATE INDEX "brand_commission_exemptions_brand_id_starts_at_ends_at_idx" ON "brand_commission_exemptions"("brand_id", "starts_at", "ends_at");

-- AddForeignKey
ALTER TABLE "platform_commission_tiers" ADD CONSTRAINT "platform_commission_tiers_rule_id_fkey" FOREIGN KEY ("rule_id") REFERENCES "platform_commission_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_fee_rates" ADD CONSTRAINT "gateway_fee_rates_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_commission_exemptions" ADD CONSTRAINT "brand_commission_exemptions_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_commission_exemptions" ADD CONSTRAINT "brand_commission_exemptions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_commission_exemptions" ADD CONSTRAINT "brand_commission_exemptions_revoked_by_id_fkey" FOREIGN KEY ("revoked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_payouts" ADD CONSTRAINT "brand_payouts_platform_commission_tier_id_fkey" FOREIGN KEY ("platform_commission_tier_id") REFERENCES "platform_commission_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
