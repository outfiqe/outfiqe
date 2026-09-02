-- CreateTable
CREATE TABLE "taste_preferences" (
    "user_id" UUID NOT NULL,
    "category_slugs" TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taste_preferences_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "taste_preferences" ADD CONSTRAINT "taste_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
