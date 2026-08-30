-- CreateEnum
CREATE TYPE "CrmActivityType" AS ENUM ('NOTE', 'CALL', 'MESSAGE', 'EMAIL');

-- CreateEnum
CREATE TYPE "CrmTaskStatus" AS ENUM ('OPEN', 'DONE');

-- CreateTable
CREATE TABLE "crm_activities" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "type" "CrmActivityType" NOT NULL,
    "body" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "author_membership_id" UUID,
    "partner_creator_id" UUID,
    "customer_user_id" UUID,
    "deal_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm_tasks" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_at" TIMESTAMP(3) NOT NULL,
    "status" "CrmTaskStatus" NOT NULL DEFAULT 'OPEN',
    "assignee_membership_id" UUID NOT NULL,
    "created_by_membership_id" UUID,
    "partner_creator_id" UUID,
    "customer_user_id" UUID,
    "deal_id" UUID,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crm_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_activities_organization_id_partner_creator_id_occurred__idx" ON "crm_activities"("organization_id", "partner_creator_id", "occurred_at");

-- CreateIndex
CREATE INDEX "crm_activities_organization_id_customer_user_id_occurred_at_idx" ON "crm_activities"("organization_id", "customer_user_id", "occurred_at");

-- CreateIndex
CREATE INDEX "crm_activities_organization_id_deal_id_occurred_at_idx" ON "crm_activities"("organization_id", "deal_id", "occurred_at");

-- CreateIndex
CREATE INDEX "crm_tasks_organization_id_assignee_membership_id_due_at_idx" ON "crm_tasks"("organization_id", "assignee_membership_id", "due_at");

-- CreateIndex
CREATE INDEX "crm_tasks_organization_id_status_due_at_idx" ON "crm_tasks"("organization_id", "status", "due_at");

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_author_membership_id_fkey" FOREIGN KEY ("author_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_partner_creator_id_fkey" FOREIGN KEY ("partner_creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_activities" ADD CONSTRAINT "crm_activities_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_assignee_membership_id_fkey" FOREIGN KEY ("assignee_membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_created_by_membership_id_fkey" FOREIGN KEY ("created_by_membership_id") REFERENCES "memberships"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_partner_creator_id_fkey" FOREIGN KEY ("partner_creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_customer_user_id_fkey" FOREIGN KEY ("customer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm_tasks" ADD CONSTRAINT "crm_tasks_deal_id_fkey" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

