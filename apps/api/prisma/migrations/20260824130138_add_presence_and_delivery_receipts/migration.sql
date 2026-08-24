-- AlterTable
ALTER TABLE "conversation_participants" ADD COLUMN     "last_delivered_at" TIMESTAMP(3),
ADD COLUMN     "last_delivered_message_id" UUID;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_seen_at" TIMESTAMP(3);
