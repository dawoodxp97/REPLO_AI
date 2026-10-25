CREATE TABLE "job_stage_outputs" (
	"job_id" uuid NOT NULL,
	"stage" text NOT NULL,
	"unit" text NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_stage_outputs_job_id_stage_unit_pk" PRIMARY KEY("job_id","stage","unit")
);
--> statement-breakpoint
CREATE TABLE "lesson_index" (
	"version_id" uuid NOT NULL,
	"chapter_key" text NOT NULL,
	"lesson_key" text NOT NULL,
	"title" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "lesson_index_version_id_lesson_key_pk" PRIMARY KEY("version_id","lesson_key")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"theme" text DEFAULT 'light' NOT NULL,
	"default_audience" text DEFAULT 'intermediate' NOT NULL,
	"auto_advance" boolean DEFAULT true NOT NULL,
	"quizzes_enabled" boolean DEFAULT true NOT NULL,
	"browser_notifications" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
DROP INDEX "tutorials_user_slug_idx";--> statement-breakpoint
DROP INDEX "tutorials_repo_idx";--> statement-breakpoint
ALTER TABLE "tutorial_versions" ADD COLUMN "generation_job_id" uuid;--> statement-breakpoint
ALTER TABLE "job_stage_outputs" ADD CONSTRAINT "job_stage_outputs_job_id_generation_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_index" ADD CONSTRAINT "lesson_index_version_id_tutorial_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."tutorial_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lesson_index_title_idx" ON "lesson_index" USING btree ("title");--> statement-breakpoint
ALTER TABLE "tutorial_versions" ADD CONSTRAINT "tutorial_versions_generation_job_id_generation_jobs_id_fk" FOREIGN KEY ("generation_job_id") REFERENCES "public"."generation_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tutorial_versions_generation_job_idx" ON "tutorial_versions" USING btree ("generation_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tutorials_user_repo_idx" ON "tutorials" USING btree ("user_id","repository_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tutorials_repo_slug_idx" ON "tutorials" USING btree ("repository_id","slug");