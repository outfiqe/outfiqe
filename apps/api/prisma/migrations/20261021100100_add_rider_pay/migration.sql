-- CreateEnum
CREATE TYPE "RiderEarningKind" AS ENUM ('VISIT', 'WASTED_VISIT');

-- CreateEnum
CREATE TYPE "RiderEarningStatus" AS ENUM ('PENDING', 'AVAILABLE', 'WITHDRAWN', 'VOIDED');

-- AlterTable
ALTER TABLE "withdraw_request_ledger_entries" ADD COLUMN     "rider_earning_id" UUID;

-- CreateTable
CREATE TABLE "rider_pay_rates" (
    "id" UUID NOT NULL,
    "country_code" CHAR(2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "employment_type" "RiderEmploymentType" NOT NULL,
    "visit_amount" INTEGER NOT NULL,
    "extra_stop_amount" INTEGER NOT NULL,
    "wasted_visit_amount" INTEGER NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rider_pay_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rider_earnings" (
    "id" UUID NOT NULL,
    "rider_id" UUID NOT NULL,
    "rider_task_id" UUID NOT NULL,
    "pay_rate_id" UUID,
    "kind" "RiderEarningKind" NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "stop_count" INTEGER NOT NULL,
    "visit_amount" INTEGER NOT NULL,
    "extra_stop_amount" INTEGER NOT NULL,
    "wasted_visit_amount" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "RiderEarningStatus" NOT NULL DEFAULT 'PENDING',
    "earned_at" TIMESTAMP(3) NOT NULL,
    "releases_at" TIMESTAMP(3) NOT NULL,
    "available_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),
    "voided_by_id" UUID,
    "void_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rider_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rider_pay_rates_country_code_employment_type_is_active_effe_idx" ON "rider_pay_rates"("country_code", "employment_type", "is_active", "effective_from");

-- CreateIndex
CREATE UNIQUE INDEX "rider_earnings_rider_task_id_key" ON "rider_earnings"("rider_task_id");

-- CreateIndex
CREATE INDEX "rider_earnings_rider_id_status_earned_at_idx" ON "rider_earnings"("rider_id", "status", "earned_at");

-- CreateIndex
CREATE INDEX "rider_earnings_status_releases_at_idx" ON "rider_earnings"("status", "releases_at");

-- CreateIndex
CREATE UNIQUE INDEX "withdraw_request_ledger_entries_rider_earning_id_key" ON "withdraw_request_ledger_entries"("rider_earning_id");

-- AddForeignKey
ALTER TABLE "withdraw_request_ledger_entries" ADD CONSTRAINT "withdraw_request_ledger_entries_rider_earning_id_fkey" FOREIGN KEY ("rider_earning_id") REFERENCES "rider_earnings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_pay_rates" ADD CONSTRAINT "rider_pay_rates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_earnings" ADD CONSTRAINT "rider_earnings_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "riders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_earnings" ADD CONSTRAINT "rider_earnings_rider_task_id_fkey" FOREIGN KEY ("rider_task_id") REFERENCES "rider_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_earnings" ADD CONSTRAINT "rider_earnings_pay_rate_id_fkey" FOREIGN KEY ("pay_rate_id") REFERENCES "rider_pay_rates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rider_earnings" ADD CONSTRAINT "rider_earnings_voided_by_id_fkey" FOREIGN KEY ("voided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheck
ALTER TABLE "rider_pay_rates" ADD CONSTRAINT "rider_pay_rates_amounts_check" CHECK (
    "visit_amount" >= 0 AND "extra_stop_amount" >= 0 AND "wasted_visit_amount" >= 0
);

-- AddCheck
ALTER TABLE "rider_earnings" ADD CONSTRAINT "rider_earnings_amounts_check" CHECK (
    "amount" >= 0 AND "stop_count" >= 0
);
