-- CreateTable
CREATE TABLE "creator_looks" (
    "id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "image_url" TEXT NOT NULL,
    "caption" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_looks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_look_products" (
    "creator_look_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,

    CONSTRAINT "creator_look_products_pkey" PRIMARY KEY ("creator_look_id","product_id")
);

-- AddForeignKey
ALTER TABLE "creator_looks" ADD CONSTRAINT "creator_looks_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_look_products" ADD CONSTRAINT "creator_look_products_creator_look_id_fkey" FOREIGN KEY ("creator_look_id") REFERENCES "creator_looks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_look_products" ADD CONSTRAINT "creator_look_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
