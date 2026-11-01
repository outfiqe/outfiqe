ALTER TABLE "crm_activities" ADD COLUMN "contact_id" UUID;
ALTER TABLE "crm_tasks" ADD COLUMN "contact_id" UUID;

CREATE INDEX "crm_activities_organization_id_contact_id_occurred_at_idx"
  ON "crm_activities"("organization_id", "contact_id", "occurred_at");
CREATE INDEX "crm_tasks_organization_id_contact_id_status_idx"
  ON "crm_tasks"("organization_id", "contact_id", "status");

ALTER TABLE "crm_activities"
  ADD CONSTRAINT "crm_activities_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "crm_tasks"
  ADD CONSTRAINT "crm_tasks_contact_id_fkey"
  FOREIGN KEY ("contact_id") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
