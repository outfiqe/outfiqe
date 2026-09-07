-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "CouponStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CouponEligibilityScopeType" AS ENUM ('BRAND', 'CATEGORY', 'PRODUCT', 'PRODUCT_TYPE');

-- CreateEnum
CREATE TYPE "CouponRedemptionStatus" AS ENUM ('CONSUMED', 'RELEASED');

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "applied_coupon_code" TEXT;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "platform_discount_amount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "brand_discount_total" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platform_discount_total" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "orders" ADD CONSTRAINT "orders_total_balances"
  CHECK (total = subtotal - platform_discount_total + delivery_fee + cod_fee);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "percent_basis_points" INTEGER,
    "fixed_amount" INTEGER,
    "max_discount_amount" INTEGER,
    "min_subtotal" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "status" "CouponStatus" NOT NULL DEFAULT 'ACTIVE',
    "total_budget_amount" INTEGER,
    "spent_amount" INTEGER NOT NULL DEFAULT 0,
    "max_redemptions" INTEGER,
    "redemption_count" INTEGER NOT NULL DEFAULT 0,
    "first_order_only" BOOLEAN NOT NULL DEFAULT false,
    "prepaid_only" BOOLEAN NOT NULL DEFAULT false,
    "stacks_with_brand_discount" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_eligibilities" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "scope_type" "CouponEligibilityScopeType" NOT NULL,
    "scope_id" UUID NOT NULL,

    CONSTRAINT "coupon_eligibilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL,
    "coupon_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "discount_amount" INTEGER NOT NULL,
    "platform_funded_amount" INTEGER NOT NULL,
    "brand_funded_amount" INTEGER NOT NULL DEFAULT 0,
    "status" "CouponRedemptionStatus" NOT NULL DEFAULT 'CONSUMED',
    "released_at" TIMESTAMP(3),
    "released_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_status_starts_at_ends_at_idx" ON "coupons"("status", "starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_eligibilities_coupon_id_scope_type_scope_id_key" ON "coupon_eligibilities"("coupon_id", "scope_type", "scope_id");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_order_id_key" ON "coupon_redemptions"("order_id");

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_eligibilities" ADD CONSTRAINT "coupon_eligibilities_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "coupon_redemptions_coupon_id_user_id_active_key" ON "coupon_redemptions"("coupon_id", "user_id") WHERE "status" <> 'RELEASED';
