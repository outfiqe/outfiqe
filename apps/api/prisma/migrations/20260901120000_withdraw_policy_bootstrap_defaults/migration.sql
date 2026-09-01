-- AlterTable
ALTER TABLE "withdraw_policies" ALTER COLUMN "updated_by_id" DROP NOT NULL;

-- CreateIndex
-- At most one active policy per ownerType. This is the write-side guarantee that makes
-- withdrawRepository.getOrCreateActivePolicy's create-then-recover-on-conflict pattern safe
-- under concurrent first-use, instead of relying on transaction isolation alone.
CREATE UNIQUE INDEX "withdraw_policies_owner_type_active_key" ON "withdraw_policies"("owner_type") WHERE "is_active" = true;

-- Bootstrap baseline policies so every environment is withdrawal-capable the moment migrations
-- finish, with no dependency on an admin having run a seed script. updated_by_id is left NULL
-- to mean "system default, no admin has customized this yet" -- see withdraw/README.md.
INSERT INTO "withdraw_policies" (
  "id", "owner_type", "min_amount", "max_amount", "window_type", "window_value",
  "max_attempts_per_window", "cooldown_after_rejection_days", "processing_note_text",
  "is_active", "updated_by_id", "created_at"
)
VALUES
  (gen_random_uuid(), 'CREATOR', 500, 100000, 'MONTHLY', 5, 1, 7,
    'Processed manually, 5-7 business days after approval.', true, NULL, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'BUSINESS', 3000, 500000, 'CUSTOM_DAYS', 14, 1, 5,
    'Processed manually, 3-5 business days after approval.', true, NULL, CURRENT_TIMESTAMP)
ON CONFLICT ("owner_type") WHERE "is_active" = true DO NOTHING;
