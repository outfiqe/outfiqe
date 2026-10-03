ALTER TYPE "CommissionSource" ADD VALUE 'OUTFIT_BUILD';

CREATE TABLE "outfit_build_visits" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "outfit_id" UUID NOT NULL,
    "outfit_version" INTEGER NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "outfit_build_visits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "outfit_build_visits_user_id_product_id_created_at_idx" ON "outfit_build_visits"("user_id", "product_id", "created_at");

ALTER TABLE "outfit_build_visits" ADD CONSTRAINT "outfit_build_visits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfit_build_visits" ADD CONSTRAINT "outfit_build_visits_outfit_id_fkey" FOREIGN KEY ("outfit_id") REFERENCES "outfits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outfit_build_visits" ADD CONSTRAINT "outfit_build_visits_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX "creator_commissions_order_item_id_key";

ALTER TABLE "creator_commissions"
    ALTER COLUMN "creator_id" DROP NOT NULL,
    ADD COLUMN "recipient_brand_id" UUID,
    ADD COLUMN "build_visit_id" UUID,
    ADD CONSTRAINT "creator_commissions_one_recipient" CHECK (("creator_id" IS NULL) <> ("recipient_brand_id" IS NULL));

CREATE INDEX "creator_commissions_order_item_id_idx" ON "creator_commissions"("order_item_id");
CREATE UNIQUE INDEX "creator_commissions_order_item_creator_key" ON "creator_commissions"("order_item_id", "creator_id") WHERE "creator_id" IS NOT NULL;
CREATE UNIQUE INDEX "creator_commissions_order_item_brand_key" ON "creator_commissions"("order_item_id", "recipient_brand_id") WHERE "recipient_brand_id" IS NOT NULL;
CREATE INDEX "creator_commissions_recipient_brand_id_status_idx" ON "creator_commissions"("recipient_brand_id", "status");

ALTER TABLE "creator_commissions" ADD CONSTRAINT "creator_commissions_recipient_brand_id_fkey" FOREIGN KEY ("recipient_brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "creator_commissions" ADD CONSTRAINT "creator_commissions_build_visit_id_fkey" FOREIGN KEY ("build_visit_id") REFERENCES "outfit_build_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "order_items"
    ADD COLUMN "attributed_outfit_id" UUID,
    ADD COLUMN "attributed_outfit_version" INTEGER;

CREATE INDEX "order_items_attributed_outfit_id_idx" ON "order_items"("attributed_outfit_id");

ALTER TABLE "order_items" ADD CONSTRAINT "order_items_attributed_outfit_id_fkey" FOREIGN KEY ("attributed_outfit_id") REFERENCES "outfits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
