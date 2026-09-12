-- AlterTable
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_total_xp_floor_check" CHECK ("total_xp" >= 0);
