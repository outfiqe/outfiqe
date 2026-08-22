-- CreateTable
CREATE TABLE "creator_competitions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "CreatorLeaderboardCategory" NOT NULL,
    "top_n" INTEGER NOT NULL,
    "badge_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_competitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "creator_competitions_badge_id_key" ON "creator_competitions"("badge_id");

-- CreateIndex
CREATE INDEX "creator_competitions_is_active_idx" ON "creator_competitions"("is_active");

-- AddForeignKey
ALTER TABLE "creator_competitions" ADD CONSTRAINT "creator_competitions_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
