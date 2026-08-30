-- CreateEnum
CREATE TYPE "CrmAuditAction" AS ENUM ('INVITE_SENT', 'INVITE_REVOKED', 'INVITE_ACCEPTED', 'MEMBER_ROLE_CHANGED', 'MEMBER_STATUS_CHANGED', 'ROLE_CREATED', 'ROLE_UPDATED', 'ROLE_DELETED', 'ORGANIZATION_RENAMED', 'OWNERSHIP_TRANSFER_REQUESTED', 'OWNERSHIP_TRANSFER_ACCEPTED', 'OWNERSHIP_TRANSFER_DECLINED', 'OWNERSHIP_TRANSFER_REVOKED', 'SUBSCRIPTION_CHECKOUT_STARTED', 'SUBSCRIPTION_ACTIVATED', 'SUBSCRIPTION_CANCELED');

-- CreateEnum
CREATE TYPE "CrmAuditOutcome" AS ENUM ('SUCCESS', 'FAILURE');

-- CreateTable
CREATE TABLE "crm_audit_logs" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "actor_membership_id" UUID,
    "action" "CrmAuditAction" NOT NULL,
    "outcome" "CrmAuditOutcome" NOT NULL DEFAULT 'SUCCESS',
    "target_type" TEXT,
    "target_id" UUID,
    "summary" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crm_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crm_audit_logs_organization_id_created_at_idx" ON "crm_audit_logs"("organization_id", "created_at");

-- AddForeignKey
ALTER TABLE "crm_audit_logs" ADD CONSTRAINT "crm_audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
