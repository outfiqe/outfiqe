-- CreateTable
CREATE TABLE "ownership_transfer_requests" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "from_membership_id" UUID NOT NULL,
    "to_membership_id" UUID NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ownership_transfer_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ownership_transfer_requests_organization_id_idx" ON "ownership_transfer_requests"("organization_id");

-- CreateIndex
CREATE INDEX "ownership_transfer_requests_to_membership_id_idx" ON "ownership_transfer_requests"("to_membership_id");

-- AddForeignKey
ALTER TABLE "ownership_transfer_requests" ADD CONSTRAINT "ownership_transfer_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership_transfer_requests" ADD CONSTRAINT "ownership_transfer_requests_from_membership_id_fkey" FOREIGN KEY ("from_membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ownership_transfer_requests" ADD CONSTRAINT "ownership_transfer_requests_to_membership_id_fkey" FOREIGN KEY ("to_membership_id") REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
