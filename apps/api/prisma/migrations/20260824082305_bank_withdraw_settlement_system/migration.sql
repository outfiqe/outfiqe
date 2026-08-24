-- CreateEnum
CREATE TYPE "BankType" AS ENUM ('COMMERCIAL', 'DEVELOPMENT', 'FINANCE');

-- CreateEnum
CREATE TYPE "WithdrawWindowType" AS ENUM ('MONTHLY', 'WEEKLY', 'CUSTOM_DAYS');

-- CreateEnum
CREATE TYPE "BrandPayoutStatus" AS ENUM ('PENDING', 'AVAILABLE', 'WITHDRAWN', 'VOIDED');

-- CreateEnum
CREATE TYPE "WithdrawOwnerKind" AS ENUM ('CREATOR', 'BRAND');

-- CreateEnum
CREATE TYPE "WithdrawRequestStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'PAID', 'REJECTED');

-- CreateEnum
CREATE TYPE "LedgerEntryKind" AS ENUM ('CREATOR_COMMISSION', 'BRAND_PAYOUT');

-- CreateTable
CREATE TABLE "nepal_banks" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "BankType" NOT NULL,
    "logo_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nepal_banks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "bank_id" UUID NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_number_ciphertext" TEXT NOT NULL,
    "account_number_last4" TEXT NOT NULL,
    "branch_name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verified_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_account_access_logs" (
    "id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_account_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdraw_policies" (
    "id" UUID NOT NULL,
    "min_amount" INTEGER NOT NULL,
    "max_amount" INTEGER NOT NULL,
    "window_type" "WithdrawWindowType" NOT NULL,
    "window_value" INTEGER NOT NULL,
    "max_attempts_per_window" INTEGER NOT NULL,
    "cooldown_after_rejection_days" INTEGER NOT NULL,
    "processing_note_text" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdraw_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_bank_accounts" (
    "id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "bank_id" UUID NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_number_ciphertext" TEXT NOT NULL,
    "account_number_last4" TEXT NOT NULL,
    "branch_name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "verified_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_bank_account_access_logs" (
    "id" UUID NOT NULL,
    "brand_bank_account_id" UUID NOT NULL,
    "admin_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_bank_account_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_commission_rules" (
    "id" UUID NOT NULL,
    "rate_percent_basis_points" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_commission_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_payouts" (
    "id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "commission_rule_id" UUID NOT NULL,
    "gross_amount" INTEGER NOT NULL,
    "platform_fee" INTEGER NOT NULL,
    "gateway_fee" INTEGER NOT NULL DEFAULT 0,
    "net_amount" INTEGER NOT NULL,
    "status" "BrandPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "available_at" TIMESTAMP(3),
    "withdrawn_at" TIMESTAMP(3),
    "voided_reason" TEXT,
    "needs_manual_clawback" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdraw_requests" (
    "id" UUID NOT NULL,
    "owner_kind" "WithdrawOwnerKind" NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "creator_id" UUID,
    "brand_id" UUID,
    "bank_account_id" UUID,
    "brand_bank_account_id" UUID,
    "policy_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "WithdrawRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" TEXT,
    "reference_note" TEXT,
    "reviewed_by_id" UUID,
    "reviewed_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdraw_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdraw_request_ledger_entries" (
    "id" UUID NOT NULL,
    "withdraw_request_id" UUID NOT NULL,
    "entry_kind" "LedgerEntryKind" NOT NULL,
    "creator_commission_id" UUID,
    "brand_payout_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdraw_request_ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "nepal_banks_code_key" ON "nepal_banks"("code");

-- CreateIndex
CREATE INDEX "nepal_banks_is_active_idx" ON "nepal_banks"("is_active");

-- CreateIndex
CREATE INDEX "bank_accounts_user_id_idx" ON "bank_accounts"("user_id");

-- CreateIndex
CREATE INDEX "bank_accounts_user_id_is_default_idx" ON "bank_accounts"("user_id", "is_default");

-- CreateIndex
CREATE INDEX "bank_account_access_logs_bank_account_id_idx" ON "bank_account_access_logs"("bank_account_id");

-- CreateIndex
CREATE INDEX "withdraw_policies_is_active_idx" ON "withdraw_policies"("is_active");

-- CreateIndex
CREATE INDEX "brand_bank_accounts_brand_id_idx" ON "brand_bank_accounts"("brand_id");

-- CreateIndex
CREATE INDEX "brand_bank_accounts_brand_id_is_default_idx" ON "brand_bank_accounts"("brand_id", "is_default");

-- CreateIndex
CREATE INDEX "brand_bank_account_access_logs_brand_bank_account_id_idx" ON "brand_bank_account_access_logs"("brand_bank_account_id");

-- CreateIndex
CREATE INDEX "platform_commission_rules_is_active_idx" ON "platform_commission_rules"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "brand_payouts_order_item_id_key" ON "brand_payouts"("order_item_id");

-- CreateIndex
CREATE INDEX "brand_payouts_brand_id_status_idx" ON "brand_payouts"("brand_id", "status");

-- CreateIndex
CREATE INDEX "withdraw_requests_creator_id_status_idx" ON "withdraw_requests"("creator_id", "status");

-- CreateIndex
CREATE INDEX "withdraw_requests_brand_id_status_idx" ON "withdraw_requests"("brand_id", "status");

-- CreateIndex
CREATE INDEX "withdraw_requests_status_created_at_idx" ON "withdraw_requests"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "withdraw_request_ledger_entries_creator_commission_id_key" ON "withdraw_request_ledger_entries"("creator_commission_id");

-- CreateIndex
CREATE UNIQUE INDEX "withdraw_request_ledger_entries_brand_payout_id_key" ON "withdraw_request_ledger_entries"("brand_payout_id");

-- CreateIndex
CREATE INDEX "withdraw_request_ledger_entries_withdraw_request_id_idx" ON "withdraw_request_ledger_entries"("withdraw_request_id");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "nepal_banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account_access_logs" ADD CONSTRAINT "bank_account_access_logs_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account_access_logs" ADD CONSTRAINT "bank_account_access_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_policies" ADD CONSTRAINT "withdraw_policies_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_bank_accounts" ADD CONSTRAINT "brand_bank_accounts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_bank_accounts" ADD CONSTRAINT "brand_bank_accounts_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "nepal_banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_bank_accounts" ADD CONSTRAINT "brand_bank_accounts_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_bank_account_access_logs" ADD CONSTRAINT "brand_bank_account_access_logs_brand_bank_account_id_fkey" FOREIGN KEY ("brand_bank_account_id") REFERENCES "brand_bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_bank_account_access_logs" ADD CONSTRAINT "brand_bank_account_access_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "platform_commission_rules" ADD CONSTRAINT "platform_commission_rules_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_payouts" ADD CONSTRAINT "brand_payouts_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_payouts" ADD CONSTRAINT "brand_payouts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_payouts" ADD CONSTRAINT "brand_payouts_commission_rule_id_fkey" FOREIGN KEY ("commission_rule_id") REFERENCES "platform_commission_rules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_brand_bank_account_id_fkey" FOREIGN KEY ("brand_bank_account_id") REFERENCES "brand_bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "withdraw_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_request_ledger_entries" ADD CONSTRAINT "withdraw_request_ledger_entries_withdraw_request_id_fkey" FOREIGN KEY ("withdraw_request_id") REFERENCES "withdraw_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_request_ledger_entries" ADD CONSTRAINT "withdraw_request_ledger_entries_creator_commission_id_fkey" FOREIGN KEY ("creator_commission_id") REFERENCES "creator_commissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdraw_request_ledger_entries" ADD CONSTRAINT "withdraw_request_ledger_entries_brand_payout_id_fkey" FOREIGN KEY ("brand_payout_id") REFERENCES "brand_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
