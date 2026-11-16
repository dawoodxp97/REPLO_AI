-- Expand: rename the domain tables, keep the old names as compatibility views,
-- and add course_id alongside the old tutorial_id for the backfill.
-- Safe to run before the new code starts; the views keep a rolling deploy readable.

ALTER TABLE "tutorials" RENAME TO "courses";
ALTER TABLE "tutorial_versions" RENAME TO "course_versions";
ALTER TABLE "tutorial_lessons" RENAME TO "course_lessons";
ALTER TABLE "tutorial_source_refs" RENAME TO "course_source_refs";
ALTER TABLE "tutorial_reports" RENAME TO "course_reports";

CREATE VIEW "tutorials" AS SELECT * FROM "courses";
CREATE VIEW "tutorial_versions" AS SELECT * FROM "course_versions";
CREATE VIEW "tutorial_lessons" AS SELECT * FROM "course_lessons";
CREATE VIEW "tutorial_source_refs" AS SELECT * FROM "course_source_refs";
CREATE VIEW "tutorial_reports" AS SELECT * FROM "course_reports";

ALTER TABLE "course_versions" ADD COLUMN "course_id" uuid;
ALTER TABLE "generation_jobs" ADD COLUMN "course_id" uuid;
ALTER TABLE "learning_progress" ADD COLUMN "course_id" uuid;
ALTER TABLE "course_reports" ADD COLUMN "course_id" uuid;

ALTER TABLE "course_versions"
  ADD CONSTRAINT "course_versions_course_id_courses_id_fk"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE cascade;
ALTER TABLE "generation_jobs"
  ADD CONSTRAINT "generation_jobs_course_id_courses_id_fk"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE set null;
ALTER TABLE "learning_progress"
  ADD CONSTRAINT "learning_progress_course_id_courses_id_fk"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE cascade;
ALTER TABLE "course_reports"
  ADD CONSTRAINT "course_reports_course_id_courses_id_fk"
  FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE cascade;
