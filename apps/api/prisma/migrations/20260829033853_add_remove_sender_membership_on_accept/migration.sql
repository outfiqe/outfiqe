-- AlterTable
ALTER TABLE "ownership_transfer_requests" ADD COLUMN     "remove_sender_membership_on_accept" BOOLEAN NOT NULL DEFAULT false;
