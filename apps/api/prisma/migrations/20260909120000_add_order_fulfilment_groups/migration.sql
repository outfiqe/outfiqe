-- CreateEnum
CREATE TYPE "OrderFulfilmentSummary" AS ENUM ('UNFULFILLED', 'PARTIALLY_SHIPPED', 'SHIPPED', 'FULFILLED', 'CANCELLED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "fulfilment_summary" "OrderFulfilmentSummary" NOT NULL DEFAULT 'UNFULFILLED';

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN "fulfilment_group_id" UUID;

-- CreateTable
CREATE TABLE "order_fulfilment_groups" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "brand_id" UUID NOT NULL,
    "status" "FulfilmentStatus" NOT NULL DEFAULT 'PLACED',
    "carrier" TEXT,
    "tracking_number" TEXT,
    "packed_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_requested_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_fulfilment_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_fulfilment_groups_brand_id_status_idx" ON "order_fulfilment_groups"("brand_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "order_fulfilment_groups_order_id_brand_id_key" ON "order_fulfilment_groups"("order_id", "brand_id");

-- CreateIndex
CREATE INDEX "order_items_fulfilment_group_id_idx" ON "order_items"("fulfilment_group_id");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_fulfilment_group_id_fkey" FOREIGN KEY ("fulfilment_group_id") REFERENCES "order_fulfilment_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_fulfilment_groups" ADD CONSTRAINT "order_fulfilment_groups_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_fulfilment_groups" ADD CONSTRAINT "order_fulfilment_groups_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
