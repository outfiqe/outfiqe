ALTER TYPE "NotificationType" ADD VALUE 'OUTFIT_ITEMS_SOLD_OUT';

ALTER TABLE "outfit_items" ADD COLUMN "sold_out_alerted_at" TIMESTAMP(3);

CREATE INDEX "outfit_items_sold_out_alerted_idx" ON "outfit_items"("product_id") WHERE "sold_out_alerted_at" IS NOT NULL;

CREATE TABLE "saved_sizes" (
    "user_id" UUID NOT NULL,
    "product_type_id" UUID NOT NULL,
    "size_label" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_sizes_pkey" PRIMARY KEY ("user_id","product_type_id"),
    CONSTRAINT "saved_sizes_size_label_not_blank" CHECK (length(btrim("size_label")) > 0)
);

CREATE INDEX "saved_sizes_product_type_id_idx" ON "saved_sizes"("product_type_id");

ALTER TABLE "saved_sizes" ADD CONSTRAINT "saved_sizes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "saved_sizes" ADD CONSTRAINT "saved_sizes_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
