-- CreateTable
CREATE TABLE "order_fee_settings" (
    "id" UUID NOT NULL,
    "standard_delivery_fee" INTEGER NOT NULL,
    "free_delivery_threshold" INTEGER NOT NULL,
    "cod_handling_fee" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_fee_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_fee_settings_history" (
    "id" UUID NOT NULL,
    "settings_id" UUID NOT NULL,
    "changed_by_id" UUID NOT NULL,
    "old_values" JSONB NOT NULL,
    "new_values" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_fee_settings_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_fee_settings_history_settings_id_created_at_idx" ON "order_fee_settings_history"("settings_id", "created_at");

-- AddForeignKey
ALTER TABLE "order_fee_settings_history" ADD CONSTRAINT "order_fee_settings_history_settings_id_fkey" FOREIGN KEY ("settings_id") REFERENCES "order_fee_settings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_fee_settings_history" ADD CONSTRAINT "order_fee_settings_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "order_fee_settings" ("id", "standard_delivery_fee", "free_delivery_threshold", "cod_handling_fee", "updated_at")
VALUES (gen_random_uuid(), 150, 5000, 50, CURRENT_TIMESTAMP);
