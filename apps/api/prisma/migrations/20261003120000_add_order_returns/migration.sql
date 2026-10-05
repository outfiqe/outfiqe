ALTER TYPE "FulfilmentStatus" ADD VALUE 'RETURNED';

ALTER TYPE "OrderFulfilmentSummary" ADD VALUE 'RETURNED';

ALTER TABLE "orders"
    ADD COLUMN "returned_at" TIMESTAMP(3),
    ADD COLUMN "return_reason" TEXT;

ALTER TABLE "order_fulfilment_groups" ADD COLUMN "returned_at" TIMESTAMP(3);
