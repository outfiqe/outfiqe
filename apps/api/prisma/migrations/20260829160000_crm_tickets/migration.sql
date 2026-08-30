-- CreateEnum
CREATE TYPE "CrmTicketType" AS ENUM ('COMPLAINT', 'REQUEST');

-- CreateEnum
CREATE TYPE "CrmTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationEntityType" ADD VALUE 'CRM_TASK';
ALTER TYPE "NotificationEntityType" ADD VALUE 'CRM_TICKET';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'CRM_ITEM_ASSIGNED';

-- CreateTable
CREATE TABLE "crm_tickets" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "CrmTicketType" NOT NULL,
    "status" "CrmTicketStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "partner_creator_id" UUID,
    "customer_user_id" UUID,
    "assignee_membership_id" UUID,
    "created_by_membership_id" UUID,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_ticket_comments" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "author_membership_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_ticket_comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_tickets_organization_id_status_created_at_idx" ON "crm_tickets"("organization_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "crm_tickets_organization_id_assignee_membership_id_idx" ON "crm_tickets"("organization_id", "assignee_membership_id");

-- CreateIndex
CREATE INDEX "crm_ticket_comments_ticket_id_created_at_idx" ON "crm_ticket_comments"("ticket_id", "created_at");

-- AddForeignKey
ALTER TABLE "crm_tickets" ADD CONSTRAINT "crm_tickets_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tickets" ADD CONSTRAINT "crm_tickets_partner_creator_id_fkey" FOREIGN KEY ("partner_creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tickets" ADD CONSTRAINT "crm_tickets_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tickets" ADD CONSTRAINT "crm_tickets_assignee_membership_id_fkey" FOREIGN KEY ("assignee_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tickets" ADD CONSTRAINT "crm_tickets_created_by_membership_id_fkey" FOREIGN KEY ("created_by_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_ticket_comments" ADD CONSTRAINT "crm_ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "crm_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_ticket_comments" ADD CONSTRAINT "crm_ticket_comments_author_membership_id_fkey" FOREIGN KEY ("author_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

