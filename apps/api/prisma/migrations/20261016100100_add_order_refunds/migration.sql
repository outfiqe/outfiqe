-- CreateEnum
CREATE TYPE "OrderRefundCause" AS ENUM ('CUSTOMER_CANCELLED', 'BRAND_UNAVAILABLE', 'HUB_INSPECTION_FAILED', 'RETURNED', 'CUSTOMER_REFUSED', 'STAFF_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "OrderRefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'NEEDS_MANUAL');

-- CreateEnum
CREATE TYPE "OrderRefundMethod" AS ENUM ('GATEWAY', 'CASH_NOT_COLLECTED', 'MANUAL_TRANSFER');

-- CreateEnum
CREATE TYPE "RefundDestinationKind" AS ENUM ('KHALTI', 'ESEWA', 'BANK');

-- CreateEnum
CREATE TYPE "BrandUnavailableRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "coupon_redemptions" ADD COLUMN     "released_amount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "amount" INTEGER;

-- CreateTable
CREATE TABLE "order_refunds" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "cause" "OrderRefundCause" NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "OrderRefundStatus" NOT NULL DEFAULT 'PENDING',
    "method" "OrderRefundMethod",
    "goods_amount" INTEGER NOT NULL,
    "fee_amount" INTEGER NOT NULL,
    "total_amount" INTEGER NOT NULL,
    "requested_by_id" UUID,
    "paid_by_id" UUID,
    "transfer_reference" TEXT,
    "gateway_response" JSONB,
    "details_reminder_sent_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_refund_lines" (
    "id" UUID NOT NULL,
    "refund_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "coupon_share" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "order_refund_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_refund_destinations" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "kind" "RefundDestinationKind" NOT NULL,
    "wallet_id" TEXT,
    "bank_id" UUID,
    "account_name" TEXT NOT NULL,
    "account_number_ciphertext" TEXT,
    "account_number_last4" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_refund_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand_unavailable_requests" (
    "id" UUID NOT NULL,
    "fulfilment_group_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "BrandUnavailableRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_id" UUID NOT NULL,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "refund_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_unavailable_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_refunds_order_id_created_at_idx" ON "order_refunds"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "order_refunds_status_created_at_idx" ON "order_refunds"("status", "created_at");

-- CreateIndex
CREATE INDEX "order_refund_lines_order_item_id_idx" ON "order_refund_lines"("order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_refund_lines_refund_id_order_item_id_key" ON "order_refund_lines"("refund_id", "order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_refund_destinations_order_id_key" ON "order_refund_destinations"("order_id");

-- CreateIndex
CREATE INDEX "brand_unavailable_requests_status_created_at_idx" ON "brand_unavailable_requests"("status", "created_at");

-- CreateIndex
CREATE INDEX "brand_unavailable_requests_brand_id_created_at_idx" ON "brand_unavailable_requests"("brand_id", "created_at");

-- CreateIndex
CREATE INDEX "brand_unavailable_requests_order_item_id_idx" ON "brand_unavailable_requests"("order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "brand_unavailable_requests_one_pending_per_item_key"
    ON "brand_unavailable_requests"("order_item_id")
    WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refunds" ADD CONSTRAINT "order_refunds_paid_by_id_fkey" FOREIGN KEY ("paid_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refund_lines" ADD CONSTRAINT "order_refund_lines_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "order_refunds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refund_lines" ADD CONSTRAINT "order_refund_lines_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refund_destinations" ADD CONSTRAINT "order_refund_destinations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_refund_destinations" ADD CONSTRAINT "order_refund_destinations_bank_id_fkey" FOREIGN KEY ("bank_id") REFERENCES "nepal_banks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_unavailable_requests" ADD CONSTRAINT "brand_unavailable_requests_fulfilment_group_id_fkey" FOREIGN KEY ("fulfilment_group_id") REFERENCES "order_fulfilment_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_unavailable_requests" ADD CONSTRAINT "brand_unavailable_requests_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_unavailable_requests" ADD CONSTRAINT "brand_unavailable_requests_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_unavailable_requests" ADD CONSTRAINT "brand_unavailable_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_unavailable_requests" ADD CONSTRAINT "brand_unavailable_requests_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "brand_unavailable_requests" ADD CONSTRAINT "brand_unavailable_requests_refund_id_fkey" FOREIGN KEY ("refund_id") REFERENCES "order_refunds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Checks
ALTER TABLE "order_refunds"
    ADD CONSTRAINT "order_refunds_amounts_check"
    CHECK ("goods_amount" >= 0 AND "fee_amount" >= 0 AND "total_amount" = "goods_amount" + "fee_amount");

ALTER TABLE "order_refunds"
    ADD CONSTRAINT "order_refunds_settled_check"
    CHECK ("status"::text <> 'SUCCEEDED' OR ("settled_at" IS NOT NULL AND "method" IS NOT NULL));

ALTER TABLE "order_refunds"
    ADD CONSTRAINT "order_refunds_manual_transfer_reference_check"
    CHECK (
        "status"::text <> 'SUCCEEDED'
        OR "method"::text <> 'MANUAL_TRANSFER'
        OR ("transfer_reference" IS NOT NULL AND "paid_by_id" IS NOT NULL)
    );

ALTER TABLE "order_refund_lines"
    ADD CONSTRAINT "order_refund_lines_amounts_check"
    CHECK ("qty" > 0 AND "amount" >= 0 AND "coupon_share" >= 0);

ALTER TABLE "order_refund_destinations"
    ADD CONSTRAINT "order_refund_destinations_kind_check"
    CHECK (
        (
            "kind"::text IN ('KHALTI', 'ESEWA')
            AND "wallet_id" IS NOT NULL
            AND "bank_id" IS NULL
            AND "account_number_ciphertext" IS NULL
            AND "account_number_last4" IS NULL
        )
        OR (
            "kind"::text = 'BANK'
            AND "wallet_id" IS NULL
            AND "bank_id" IS NOT NULL
            AND "account_number_ciphertext" IS NOT NULL
            AND "account_number_last4" IS NOT NULL
        )
    );

ALTER TABLE "brand_unavailable_requests"
    ADD CONSTRAINT "brand_unavailable_requests_qty_check"
    CHECK ("qty" > 0);

ALTER TABLE "brand_unavailable_requests"
    ADD CONSTRAINT "brand_unavailable_requests_decided_check"
    CHECK (("status"::text = 'PENDING') = ("decided_at" IS NULL));

ALTER TABLE "coupon_redemptions"
    ADD CONSTRAINT "coupon_redemptions_released_amount_check"
    CHECK ("released_amount" >= 0 AND "released_amount" <= "platform_funded_amount");

ALTER TABLE "payment_transactions"
    ADD CONSTRAINT "payment_transactions_amount_check"
    CHECK ("amount" IS NULL OR "amount" >= 0);
