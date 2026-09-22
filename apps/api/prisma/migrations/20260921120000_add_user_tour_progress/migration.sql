-- CreateEnum
CREATE TYPE "TourOutcome" AS ENUM ('COMPLETED', 'DISMISSED');

-- CreateTable
CREATE TABLE "user_tour_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tour_key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "outcome" "TourOutcome" NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_tour_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_tour_progress_user_id_tour_key_key" ON "user_tour_progress"("user_id", "tour_key");

-- AddForeignKey
ALTER TABLE "user_tour_progress" ADD CONSTRAINT "user_tour_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
