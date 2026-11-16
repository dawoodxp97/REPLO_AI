-- Contract: drop the old columns and compatibility views, keep course_id,
-- and rename the remaining indexes and constraints to the course vocabulary.

DROP VIEW "tutorials";
DROP VIEW "tutorial_versions";
DROP VIEW "tutorial_lessons";
DROP VIEW "tutorial_source_refs";
DROP VIEW "tutorial_reports";

CREATE INDEX "learning_progress_user_course_idx" ON "learning_progress" ("user_id", "course_id");
CREATE INDEX "course_reports_course_idx" ON "course_reports" ("course_id");
CREATE UNIQUE INDEX "course_reports_course_reporter_uniq" ON "course_reports" ("course_id", "reporter_user_id");
CREATE UNIQUE INDEX "course_versions_course_no_idx" ON "course_versions" ("course_id", "version_no");

ALTER TABLE "generation_jobs" DROP CONSTRAINT "generation_jobs_tutorial_id_tutorials_id_fk";
ALTER TABLE "learning_progress" DROP CONSTRAINT "learning_progress_tutorial_id_tutorials_id_fk";
ALTER TABLE "course_versions" DROP CONSTRAINT "tutorial_versions_tutorial_id_tutorials_id_fk";
ALTER TABLE "course_reports" DROP CONSTRAINT "tutorial_reports_tutorial_id_tutorials_id_fk";

ALTER TABLE "generation_jobs" DROP COLUMN "tutorial_id";
ALTER TABLE "learning_progress" DROP COLUMN "tutorial_id";
ALTER TABLE "course_versions" DROP COLUMN "tutorial_id";
ALTER TABLE "course_reports" DROP COLUMN "tutorial_id";

ALTER TABLE "course_versions"
  RENAME CONSTRAINT "tutorial_versions_snapshot_id_repository_snapshots_id_fk"
  TO "course_versions_snapshot_id_repository_snapshots_id_fk";
ALTER TABLE "course_versions"
  RENAME CONSTRAINT "tutorial_versions_generation_job_id_generation_jobs_id_fk"
  TO "course_versions_generation_job_id_generation_jobs_id_fk";
ALTER TABLE "course_lessons"
  RENAME CONSTRAINT "tutorial_lessons_version_id_tutorial_versions_id_fk"
  TO "course_lessons_version_id_course_versions_id_fk";
ALTER TABLE "course_source_refs"
  RENAME CONSTRAINT "tutorial_source_refs_version_id_tutorial_versions_id_fk"
  TO "course_source_refs_version_id_course_versions_id_fk";
ALTER TABLE "learning_progress"
  RENAME CONSTRAINT "learning_progress_version_id_tutorial_versions_id_fk"
  TO "learning_progress_version_id_course_versions_id_fk";
ALTER TABLE "quiz_attempts"
  RENAME CONSTRAINT "quiz_attempts_version_id_tutorial_versions_id_fk"
  TO "quiz_attempts_version_id_course_versions_id_fk";
ALTER TABLE "courses"
  RENAME CONSTRAINT "tutorials_user_id_users_id_fk"
  TO "courses_user_id_users_id_fk";
ALTER TABLE "courses"
  RENAME CONSTRAINT "tutorials_repository_id_repositories_id_fk"
  TO "courses_repository_id_repositories_id_fk";
ALTER TABLE "courses"
  RENAME CONSTRAINT "tutorials_current_version_id_tutorial_versions_id_fk"
  TO "courses_current_version_id_course_versions_id_fk";
ALTER TABLE "courses"
  RENAME CONSTRAINT "tutorials_share_token_unique"
  TO "courses_share_token_unique";

ALTER TABLE "courses" RENAME CONSTRAINT "tutorials_pkey" TO "courses_pkey";
ALTER TABLE "course_versions" RENAME CONSTRAINT "tutorial_versions_pkey" TO "course_versions_pkey";
ALTER TABLE "course_reports" RENAME CONSTRAINT "tutorial_reports_pkey" TO "course_reports_pkey";
ALTER TABLE "course_lessons"
  RENAME CONSTRAINT "tutorial_lessons_version_id_lesson_key_pk"
  TO "course_lessons_version_id_lesson_key_pk";
ALTER TABLE "course_source_refs"
  RENAME CONSTRAINT "tutorial_source_refs_version_id_ref_id_pk"
  TO "course_source_refs_version_id_ref_id_pk";

ALTER INDEX "tutorial_lessons_title_trgm_idx" RENAME TO "course_lessons_title_trgm_idx";
ALTER INDEX "tutorial_source_refs_path_idx" RENAME TO "course_source_refs_path_idx";
ALTER INDEX "tutorial_versions_generation_job_idx" RENAME TO "course_versions_generation_job_idx";
ALTER INDEX "tutorial_versions_snapshot_idx" RENAME TO "course_versions_snapshot_idx";
ALTER INDEX "tutorials_user_repo_idx" RENAME TO "courses_user_repo_idx";
ALTER INDEX "tutorials_repo_slug_idx" RENAME TO "courses_repo_slug_idx";
ALTER INDEX "tutorials_visibility_idx" RENAME TO "courses_visibility_idx";
ALTER INDEX "tutorials_title_trgm_idx" RENAME TO "courses_title_trgm_idx";
