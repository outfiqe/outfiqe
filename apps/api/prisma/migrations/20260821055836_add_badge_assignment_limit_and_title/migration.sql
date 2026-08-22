-- AlterTable
ALTER TABLE "badges" ADD COLUMN     "assignment_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "assignment_limit" INTEGER,
ADD COLUMN     "is_title_eligible" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user_badges" ADD COLUMN     "is_title" BOOLEAN NOT NULL DEFAULT false;
