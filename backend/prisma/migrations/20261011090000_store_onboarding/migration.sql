-- Support lightweight store registration and manager-led profile completion.
ALTER TABLE "locations"
  ALTER COLUMN "code" DROP NOT NULL,
  ALTER COLUMN "type" DROP NOT NULL,
  ALTER COLUMN "state" DROP NOT NULL,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "pincode" TEXT,
  ADD COLUMN "phone" TEXT,
  ADD COLUMN "gstin" TEXT,
  ADD COLUMN "employee_count" INTEGER,
  ADD COLUMN "operating_hours" TEXT,
  ADD COLUMN "profile_completed" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "locations" ALTER COLUMN "current_compliance_score" SET DEFAULT 0.0;
UPDATE "locations" SET "current_compliance_score" = 0.0
WHERE NOT EXISTS (
  SELECT 1 FROM "documents" WHERE "documents"."location_id" = "locations"."id"
);
