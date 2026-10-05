CREATE TYPE "OutfitOfferStatus" AS ENUM (
    'PAYMENT_PENDING',
    'PAYMENT_FAILED',
    'AWAITING_RESPONSE',
    'ACCEPTED',
    'POSTED',
    'RELEASED',
    'DECLINED',
    'CANCELLED',
    'EXPIRED',
    'LOOK_REMOVED'
);

CREATE TYPE "OutfitOfferRefundStatus" AS ENUM ('NOT_NEEDED', 'PENDING', 'REFUNDED', 'NEEDS_MANUAL_REFUND');

CREATE TYPE "OutfitOfferPayoutStatus" AS ENUM ('NONE', 'AVAILABLE', 'PAID');

ALTER TYPE "NotificationType" ADD VALUE 'OUTFIT_OFFER_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'OUTFIT_OFFER_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'OUTFIT_OFFER_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE 'OUTFIT_OFFER_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE 'OUTFIT_OFFER_RELEASED';
ALTER TYPE "NotificationType" ADD VALUE 'OUTFIT_OFFER_REFUNDED';

ALTER TYPE "NotificationEntityType" ADD VALUE 'OUTFIT_OFFER';

ALTER TYPE "LedgerEntryKind" ADD VALUE 'OFFER_PAYOUT';

CREATE TABLE "outfit_offers" (
    "id" UUID NOT NULL,
    "outfit_id" UUID NOT NULL,
    "outfit_version" INTEGER NOT NULL,
    "brand_id" UUID NOT NULL,
    "sent_by_id" UUID,
    "creator_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "note" TEXT,
    "payment_method" "PaymentMethod" NOT NULL,
    "status" "OutfitOfferStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
    "refund_status" "OutfitOfferRefundStatus" NOT NULL DEFAULT 'NOT_NEEDED',
    "payout_status" "OutfitOfferPayoutStatus" NOT NULL DEFAULT 'NONE',
    "paid_at" TIMESTAMP(3),
    "accept_by" TIMESTAMP(3),
    "accepted_at" TIMESTAMP(3),
    "post_by" TIMESTAMP(3),
    "look_id" UUID,
    "posted_at" TIMESTAMP(3),
    "release_at" TIMESTAMP(3),
    "released_at" TIMESTAMP(3),
    "paid_out_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "closed_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outfit_offers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "outfit_offers_amount_positive" CHECK ("amount" > 0),
    CONSTRAINT "outfit_offers_wallet_payment" CHECK ("payment_method" IN ('ESEWA', 'KHALTI'))
);

CREATE UNIQUE INDEX "outfit_offers_look_id_key" ON "outfit_offers"("look_id");
CREATE UNIQUE INDEX "outfit_offers_one_open_offer_per_creator" ON "outfit_offers"("outfit_id", "creator_id")
    WHERE "status" IN ('PAYMENT_PENDING', 'AWAITING_RESPONSE', 'ACCEPTED', 'POSTED');
CREATE INDEX "outfit_offers_creator_id_created_at_idx" ON "outfit_offers"("creator_id", "created_at");
CREATE INDEX "outfit_offers_brand_id_created_at_idx" ON "outfit_offers"("brand_id", "created_at");
CREATE INDEX "outfit_offers_status_updated_at_idx" ON "outfit_offers"("status", "updated_at");
CREATE INDEX "outfit_offers_creator_id_payout_status_idx" ON "outfit_offers"("creator_id", "payout_status");
CREATE INDEX "outfit_offers_refund_status_idx" ON "outfit_offers"("refund_status");

ALTER TABLE "outfit_offers" ADD CONSTRAINT "outfit_offers_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outfit_offers" ADD CONSTRAINT "outfit_offers_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outfit_offers" ADD CONSTRAINT "outfit_offers_sent_by_id_fkey" FOREIGN KEY ("sent_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "outfit_offers" ADD CONSTRAINT "outfit_offers_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outfit_offers" ADD CONSTRAINT "outfit_offers_look_id_fkey" FOREIGN KEY ("look_id") REFERENCES "creator_looks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "outfit_offer_payments" (
    "id" UUID NOT NULL,
    "offer_id" UUID NOT NULL,
    "provider" "PaymentMethod" NOT NULL,
    "type" "PaymentTransactionType" NOT NULL DEFAULT 'PAYMENT',
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'INITIATED',
    "transaction_ref" TEXT,
    "raw_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_offer_payments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "outfit_offer_payments_transaction_ref_key" ON "outfit_offer_payments"("transaction_ref");
CREATE INDEX "outfit_offer_payments_offer_id_status_idx" ON "outfit_offer_payments"("offer_id", "status");

ALTER TABLE "outfit_offer_payments" ADD CONSTRAINT "outfit_offer_payments_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "outfit_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "withdraw_request_ledger_entries" ADD COLUMN "outfit_offer_id" UUID;
CREATE UNIQUE INDEX "withdraw_request_ledger_entries_outfit_offer_id_key" ON "withdraw_request_ledger_entries"("outfit_offer_id");
ALTER TABLE "withdraw_request_ledger_entries" ADD CONSTRAINT "withdraw_request_ledger_entries_outfit_offer_id_fkey" FOREIGN KEY ("outfit_offer_id") REFERENCES "outfit_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
