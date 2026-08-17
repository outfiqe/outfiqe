-- CreateTable
CREATE TABLE "size_options" (
    "id" UUID NOT NULL,
    "type" "ProductType" NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "size_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "size_options_type_label_key" ON "size_options"("type", "label");
