-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'ESEWA', 'KHALTI');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PAID', 'DUE', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "FulfilmentStatus" AS ENUM ('PLACED', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentTransactionType" AS ENUM ('PAYMENT', 'REFUND');

-- CreateEnum
CREATE TYPE "PaymentTransactionStatus" AS ENUM ('INITIATED', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'APPROVED', 'AVAILABLE', 'PAID', 'VOIDED');

-- CreateEnum
CREATE TYPE "CommissionSource" AS ENUM ('TAG_CLICK', 'INTERNAL_LINK', 'EXTERNAL_LINK');

-- CreateEnum
CREATE TYPE "CreatorLinkType" AS ENUM ('INTERNAL_SINGLE_USE', 'EXTERNAL_REUSABLE');

-- CreateEnum
CREATE TYPE "CreatorLinkStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'REVOKED');

-- AlterTable
ALTER TABLE "product_sizes" ADD COLUMN     "stock" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "size_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "landmark" TEXT,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "fulfilment_status" "FulfilmentStatus" NOT NULL DEFAULT 'PLACED',
    "subtotal" INTEGER NOT NULL,
    "delivery_fee" INTEGER NOT NULL,
    "cod_fee" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "needs_manual_refund" BOOLEAN NOT NULL DEFAULT false,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "size_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "attributed_creator_id" UUID,
    "attributed_creator_look_id" UUID,
    "attributed_link_id" UUID,
    "attribution_source" "CommissionSource",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "provider" "PaymentMethod" NOT NULL,
    "type" "PaymentTransactionType" NOT NULL DEFAULT 'PAYMENT',
    "status" "PaymentTransactionStatus" NOT NULL DEFAULT 'INITIATED',
    "transaction_ref" TEXT,
    "raw_response" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_idempotency" (
    "id" UUID NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "response_body" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_idempotency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commission_tiers" (
    "id" UUID NOT NULL,
    "min_price" INTEGER NOT NULL,
    "max_price" INTEGER,
    "amount" INTEGER NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commission_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_commissions" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "source" "CommissionSource" NOT NULL,
    "tag_click_id" UUID,
    "link_click_id" UUID,
    "tier_id" UUID NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "approved_at" TIMESTAMP(3),
    "available_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "voided_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_links" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "product_id" UUID,
    "token" TEXT NOT NULL,
    "type" "CreatorLinkType" NOT NULL,
    "status" "CreatorLinkStatus" NOT NULL DEFAULT 'ACTIVE',
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_link_clicks" (
    "id" UUID NOT NULL,
    "link_id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_link_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "cart_items_cart_id_size_id_key" ON "cart_items"("cart_id", "size_id");

-- CreateIndex
CREATE INDEX "orders_user_id_created_at_idx" ON "orders"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_transaction_ref_key" ON "payment_transactions"("transaction_ref");

-- CreateIndex
CREATE INDEX "payment_transactions_order_id_status_idx" ON "payment_transactions"("order_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "request_idempotency_user_id_endpoint_idempotency_key_key" ON "request_idempotency"("user_id", "endpoint", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "creator_commissions_order_item_id_key" ON "creator_commissions"("order_item_id");

-- CreateIndex
CREATE INDEX "creator_commissions_creator_id_status_idx" ON "creator_commissions"("creator_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "creator_links_token_key" ON "creator_links"("token");

-- CreateIndex
CREATE INDEX "creator_links_creator_id_idx" ON "creator_links"("creator_id");

-- CreateIndex
CREATE INDEX "creator_link_clicks_link_id_idx" ON "creator_link_clicks"("link_id");

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "product_sizes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_size_id_fkey" FOREIGN KEY ("size_id") REFERENCES "product_sizes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_attributed_creator_id_fkey" FOREIGN KEY ("attributed_creator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_attributed_creator_look_id_fkey" FOREIGN KEY ("attributed_creator_look_id") REFERENCES "creator_looks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_attributed_link_id_fkey" FOREIGN KEY ("attributed_link_id") REFERENCES "creator_links"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_idempotency" ADD CONSTRAINT "request_idempotency_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_commissions" ADD CONSTRAINT "creator_commissions_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_commissions" ADD CONSTRAINT "creator_commissions_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_commissions" ADD CONSTRAINT "creator_commissions_tag_click_id_fkey" FOREIGN KEY ("tag_click_id") REFERENCES "creator_look_tag_clicks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_commissions" ADD CONSTRAINT "creator_commissions_link_click_id_fkey" FOREIGN KEY ("link_click_id") REFERENCES "creator_link_clicks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_commissions" ADD CONSTRAINT "creator_commissions_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "commission_tiers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_links" ADD CONSTRAINT "creator_links_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_links" ADD CONSTRAINT "creator_links_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_link_clicks" ADD CONSTRAINT "creator_link_clicks_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "creator_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_link_clicks" ADD CONSTRAINT "creator_link_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
