-- CreateEnum
CREATE TYPE "ConversationMemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('USER', 'SYSTEM');

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "created_by_id" UUID,
ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "conversation_participants" ADD COLUMN     "role" "ConversationMemberRole" NOT NULL DEFAULT 'MEMBER';

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "kind" "MessageKind" NOT NULL DEFAULT 'USER',
ADD COLUMN     "system_event" JSONB;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
