-- AlterTable
ALTER TABLE "withdraw_requests" ADD COLUMN     "paid_by_id" UUID;

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_paid_by_id_fkey" FOREIGN KEY ("paid_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
