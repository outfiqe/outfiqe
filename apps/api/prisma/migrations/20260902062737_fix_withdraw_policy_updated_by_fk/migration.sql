-- DropForeignKey
ALTER TABLE "withdraw_policies" DROP CONSTRAINT "withdraw_policies_updated_by_id_fkey";

-- AddForeignKey
ALTER TABLE "withdraw_policies" ADD CONSTRAINT "withdraw_policies_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
