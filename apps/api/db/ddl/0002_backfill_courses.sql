-- Backfill: copy every tutorial_id into course_id.
UPDATE "course_versions" SET "course_id" = "tutorial_id" WHERE "course_id" IS NULL;
UPDATE "generation_jobs" SET "course_id" = "tutorial_id" WHERE "course_id" IS NULL;
UPDATE "learning_progress" SET "course_id" = "tutorial_id" WHERE "course_id" IS NULL;
UPDATE "course_reports" SET "course_id" = "tutorial_id" WHERE "course_id" IS NULL;

ALTER TABLE "course_versions" ALTER COLUMN "course_id" SET NOT NULL;
ALTER TABLE "learning_progress" ALTER COLUMN "course_id" SET NOT NULL;
ALTER TABLE "course_reports" ALTER COLUMN "course_id" SET NOT NULL;
