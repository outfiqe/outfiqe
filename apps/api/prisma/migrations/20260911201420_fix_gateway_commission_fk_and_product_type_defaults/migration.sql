-- DropForeignKey
ALTER TABLE "gateway_fee_rates" DROP CONSTRAINT "gateway_fee_rates_updated_by_id_fkey";

-- DropForeignKey
ALTER TABLE "platform_commission_rules" DROP CONSTRAINT "platform_commission_rules_updated_by_id_fkey";

-- DropIndex
DROP INDEX "users_avatar_image_asset_id_idx";

-- AlterTable
ALTER TABLE "product_types" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "platform_commission_rules" ADD CONSTRAINT "platform_commission_rules_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gateway_fee_rates" ADD CONSTRAINT "gateway_fee_rates_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
