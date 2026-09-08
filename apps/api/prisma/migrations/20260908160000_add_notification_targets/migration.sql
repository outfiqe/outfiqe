-- CreateEnum
CREATE TYPE "NotificationSurface" AS ENUM ('WEB', 'ADMIN');

-- AlterTable
ALTER TABLE "notifications" ADD COLUMN     "target_surface" "NotificationSurface",
ADD COLUMN     "target_path" TEXT;
