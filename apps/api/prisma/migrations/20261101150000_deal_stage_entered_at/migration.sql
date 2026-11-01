ALTER TABLE "deals" ADD COLUMN "stage_entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "deals" SET "stage_entered_at" = "updated_at";
